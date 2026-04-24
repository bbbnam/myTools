// src/hooks/useBloodPressure.js

import { useState, useEffect, useCallback } from 'react';
import { classifyBP, todayStr, nowTimeStr, generateId } from '../utils/bpClassify';
import {
  appendRecord, readMonthRecords, uploadMonthRecords,
  overwriteMonthRecords, createAndInitSpreadsheet,
  findExistingSpreadsheet, getSheetTabs,
} from '../utils/sheetsApi';
import { loadTokens, saveTokens, clearTokens, buildOAuthUrl } from '../utils/googleAuth';

const SHEET_ID_KEY   = 'bp_spreadsheet_id';
const SYNCED_IDS_KEY = 'bp_synced_ids';

function localKey(yearMonth) { return `bp_records_${yearMonth}`; }

function loadLocalMonth(yearMonth) {
  try { return JSON.parse(localStorage.getItem(localKey(yearMonth))) || []; }
  catch { return []; }
}
function saveLocalMonth(yearMonth, records) {
  localStorage.setItem(localKey(yearMonth), JSON.stringify(records));
}

function getAllMonths() {
  const months = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('bp_records_')) {
      months.push(key.replace('bp_records_', ''));
    }
  }
  return months.sort().reverse();
}

function loadSyncedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SYNCED_IDS_KEY)) || []); }
  catch { return new Set(); }
}
function saveSyncedIds(ids) {
  localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...ids]));
}

function sortByDateTime(records) {
  return [...records].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time.padStart(5, '0')}`);
    const dateB = new Date(`${b.date}T${b.time.padStart(5, '0')}`);
    return dateB - dateA;
  });
}

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function useBloodPressure() {
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [records, setRecords]             = useState(() => sortByDateTime(loadLocalMonth(currentYearMonth())));
  const [allMonths, setAllMonths]         = useState(getAllMonths);
  const [tokens, setTokens]               = useState(loadTokens);
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem(SHEET_ID_KEY) || ''
  );
  const [syncing, setSyncing]         = useState(false);
  const [syncError, setSyncError]     = useState('');
  const [syncOk, setSyncOk]           = useState(false);
  const [syncedIds, setSyncedIds]     = useState(loadSyncedIds);

  // 시트 탭 목록 관련 상태
  const [sheetTabs, setSheetTabs]           = useState([]);       // 시트에 있는 월 탭 목록
  const [loadingTabs, setLoadingTabs]       = useState(false);    // 탭 목록 로딩 중
  const [selectedTabs, setSelectedTabs]     = useState([]);       // 사용자가 선택한 월들
  const [syncingTabs, setSyncingTabs]       = useState(false);    // 선택 월 동기화 중
  const [tabSyncProgress, setTabSyncProgress] = useState('');     // 진행 상황 메시지

  const hasUnsynced = records.some(r => r.id && !syncedIds.has(r.id));

  useEffect(() => {
    setRecords(sortByDateTime(loadLocalMonth(selectedMonth)));
  }, [selectedMonth]);

  // OAuth 콜백 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const at = params.get('access_token');
    const rt = params.get('refresh_token');
    const ei = params.get('expires_in');
    if (at) {
      const t = { access_token: at, refresh_token: rt, expires_in: ei };
      saveTokens(t);
      setTokens(loadTokens());
      window.history.replaceState({}, '', '/bp');
      findExistingSpreadsheet()
        .then(id => {
          if (id) {
            setSpreadsheetId(id);
            localStorage.setItem(SHEET_ID_KEY, id);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const currentTokens = loadTokens();
    const currentSheetId = localStorage.getItem(SHEET_ID_KEY);
    if (currentTokens && !currentSheetId) {
      findExistingSpreadsheet()
        .then(id => {
          if (id) {
            setSpreadsheetId(id);
            localStorage.setItem(SHEET_ID_KEY, id);
          }
        })
        .catch(() => {});
    }
  }, [tokens]);

  useEffect(() => {
    if (spreadsheetId) localStorage.setItem(SHEET_ID_KEY, spreadsheetId);
  }, [spreadsheetId]);

  // 기록 추가
  const addRecord = useCallback(async (form) => {
    const level = classifyBP(Number(form.systolic), Number(form.diastolic));
    const date  = form.date || todayStr();
    const record = {
      id:        generateId(),
      date,
      time:      form.time      || nowTimeStr(),
      timeSlot:  form.timeSlot  || 'other',
      systolic:  Number(form.systolic),
      diastolic: Number(form.diastolic),
      pulse:     Number(form.pulse) || 0,
      weight:    form.weight ? Number(form.weight) : null,
      bpLevel:   level.label,
      memo:      form.memo || '',
      levelId:   level.id,
    };

    const yearMonth = date.slice(0, 7);
    const existing  = loadLocalMonth(yearMonth);
    const next      = sortByDateTime([record, ...existing]);
    saveLocalMonth(yearMonth, next);

    if (yearMonth === selectedMonth) setRecords(next);
    setAllMonths(getAllMonths());

    if (tokens && spreadsheetId) {
      setSyncing(true);
      setSyncError('');
      try {
        await appendRecord(spreadsheetId, record);
        const newIds = new Set(syncedIds);
        newIds.add(record.id);
        setSyncedIds(newIds);
        saveSyncedIds(newIds);
        setSyncOk(true);
        setTimeout(() => setSyncOk(false), 2500);
      } catch (e) {
        setSyncError('Sheets 저장 실패: ' + e.message);
      } finally {
        setSyncing(false);
      }
    }

    return record;
  }, [selectedMonth, tokens, spreadsheetId, syncedIds]);

  // 선택 월 시트 → 로컬 동기화
  const syncWithSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setSyncing(true);
    setSyncError('');
    try {
      const remote = await readMonthRecords(spreadsheetId, selectedMonth);
      const sorted = sortByDateTime(remote);

      saveLocalMonth(selectedMonth, sorted);
      setRecords(sorted);
      setAllMonths(getAllMonths());

      const newIds = new Set(syncedIds);
      sorted.forEach(r => { if (r.id) newIds.add(r.id); });
      setSyncedIds(newIds);
      saveSyncedIds(newIds);

      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('동기화 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId, selectedMonth, syncedIds]);

  // 선택 월 로컬 → 시트 업로드
  const uploadLocalToSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setSyncing(true);
    setSyncError('');
    try {
      const current = loadLocalMonth(selectedMonth);
      const withIds = current.map(r => ({ ...r, id: r.id || generateId() }));
      await uploadMonthRecords(spreadsheetId, selectedMonth, withIds);

      const sorted = sortByDateTime(withIds);
      saveLocalMonth(selectedMonth, sorted);
      setRecords(sorted);

      const newIds = new Set(syncedIds);
      sorted.forEach(r => newIds.add(r.id));
      setSyncedIds(newIds);
      saveSyncedIds(newIds);

      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('업로드 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId, selectedMonth, syncedIds]);

  // 시트 탭 목록 불러오기
  const loadSheetTabs = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setLoadingTabs(true);
    setSyncError('');
    try {
      const tabs = await getSheetTabs(spreadsheetId);
      setSheetTabs(tabs);
      setSelectedTabs([]); // 선택 초기화
    } catch (e) {
      setSyncError('탭 목록 조회 실패: ' + e.message);
    } finally {
      setLoadingTabs(false);
    }
  }, [tokens, spreadsheetId]);

  // 선택한 월들 시트 → 로컬 일괄 동기화
  const syncSelectedTabs = useCallback(async () => {
    if (!tokens || !spreadsheetId || selectedTabs.length === 0) return;
    setSyncingTabs(true);
    setSyncError('');
    try {
      const newIds = new Set(syncedIds);

      for (const yearMonth of selectedTabs) {
        setTabSyncProgress(`${yearMonth} 동기화 중...`);
        const remote = await readMonthRecords(spreadsheetId, yearMonth);
        const sorted = sortByDateTime(remote);

        saveLocalMonth(yearMonth, sorted);
        sorted.forEach(r => { if (r.id) newIds.add(r.id); });

        // 현재 선택된 월이면 화면도 업데이트
        if (yearMonth === selectedMonth) setRecords(sorted);
      }

      setAllMonths(getAllMonths());
      setSyncedIds(newIds);
      saveSyncedIds(newIds);
      setSelectedTabs([]);
      setSheetTabs([]);
      setTabSyncProgress('');

      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('일괄 동기화 실패: ' + e.message);
      setTabSyncProgress('');
    } finally {
      setSyncingTabs(false);
    }
  }, [tokens, spreadsheetId, selectedTabs, selectedMonth, syncedIds]);

  // 스프레드시트 자동 생성
  const createSpreadsheet = useCallback(async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const id = await createAndInitSpreadsheet();
      setSpreadsheetId(id);
      localStorage.setItem(SHEET_ID_KEY, id);
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('생성 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  // 기록 삭제 (로컬 + 시트 반영)
  const deleteRecord = useCallback(async (index) => {
    const target    = records[index];
    const next      = records.filter((_, i) => i !== index);
    const yearMonth = target.date.slice(0, 7);

    saveLocalMonth(yearMonth, next);
    setRecords(next);

    if (target.id) {
      const newIds = new Set(syncedIds);
      newIds.delete(target.id);
      setSyncedIds(newIds);
      saveSyncedIds(newIds);
    }

    if (tokens && spreadsheetId) {
      try {
        await overwriteMonthRecords(spreadsheetId, yearMonth, next);
      } catch {
        // 시트 반영 실패해도 로컬은 이미 삭제됨
      }
    }
  }, [records, syncedIds, tokens, spreadsheetId]);

  const login  = () => { window.location.href = buildOAuthUrl(); };
  const logout = () => {
    clearTokens();
    setTokens(null);
    setSpreadsheetId('');
    setSyncedIds(new Set());
    setSheetTabs([]);
    setSelectedTabs([]);
    localStorage.removeItem(SHEET_ID_KEY);
    localStorage.removeItem(SYNCED_IDS_KEY);
  };

  return {
    records, addRecord, deleteRecord,
    selectedMonth, setSelectedMonth, allMonths,
    syncWithSheets, uploadLocalToSheets,
    createSpreadsheet,
    tokens, login, logout,
    spreadsheetId,
    syncing, syncError, syncOk,
    hasUnsynced,
    // 탭 목록 관련
    sheetTabs, loadingTabs, loadSheetTabs,
    selectedTabs, setSelectedTabs,
    syncingTabs, syncSelectedTabs, tabSyncProgress,
  };
}