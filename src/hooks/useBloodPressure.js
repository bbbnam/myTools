// src/hooks/useBloodPressure.js

import { useState, useEffect, useCallback } from 'react';
import { classifyBP, todayStr, nowTimeStr, generateId } from '../utils/bpClassify';
import { appendRecord, readAllRecords, uploadAllRecords, createAndInitSpreadsheet, findExistingSpreadsheet } from '../utils/sheetsApi';
import { loadTokens, saveTokens, clearTokens, buildOAuthUrl } from '../utils/googleAuth';

const LOCAL_KEY      = 'bp_records';
const SHEET_ID_KEY   = 'bp_spreadsheet_id';
const SYNCED_IDS_KEY = 'bp_synced_ids';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
  catch { return []; }
}
function saveLocal(records) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
}
function loadSyncedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SYNCED_IDS_KEY)) || []); }
  catch { return new Set(); }
}
function saveSyncedIds(ids) {
  localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...ids]));
}

// 날짜+시간 기준 최신순 정렬 (9:30 vs 09:30 형식 차이 처리)
function sortByDateTime(records) {
  return [...records].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time.padStart(5, '0')}`);
    const dateB = new Date(`${b.date}T${b.time.padStart(5, '0')}`);
    return dateB - dateA;
  });
}

export function useBloodPressure() {
  const [records, setRecords]             = useState(() => sortByDateTime(loadLocal()));
  const [tokens, setTokens]               = useState(loadTokens);
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem(SHEET_ID_KEY) || ''
  );
  const [syncing, setSyncing]     = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncOk, setSyncOk]       = useState(false);
  const [syncedIds, setSyncedIds] = useState(loadSyncedIds);

  const hasUnsynced = records.some(r => r.id && !syncedIds.has(r.id));

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

  // 토큰 있는데 spreadsheetId 없을 때 자동 검색
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

  // Spreadsheet ID 저장
  useEffect(() => {
    if (spreadsheetId) localStorage.setItem(SHEET_ID_KEY, spreadsheetId);
  }, [spreadsheetId]);

  // 기록 추가
  const addRecord = useCallback(async (form) => {
    const level = classifyBP(Number(form.systolic), Number(form.diastolic));
    const record = {
      id:        generateId(),
      date:      form.date      || todayStr(),
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

    const next = sortByDateTime([record, ...records]);
    setRecords(next);
    saveLocal(next);

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
  }, [records, tokens, spreadsheetId, syncedIds]);

  // ── 시트 데이터로 로컬 완전 교체 ──
  const syncWithSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setSyncing(true);
    setSyncError('');
    try {
      const remote = await readAllRecords(spreadsheetId);
      const sorted = sortByDateTime(remote);

      setRecords(sorted);
      saveLocal(sorted);

      const newIds = new Set();
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
  }, [tokens, spreadsheetId]);

  // ── 로컬 기록 시트에 업로드 ──
  const uploadLocalToSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setSyncing(true);
    setSyncError('');
    try {
      const currentRecords = loadLocal();
      const withIds = currentRecords.map(r => ({
        ...r,
        id: r.id || generateId(),
      }));
      await uploadAllRecords(spreadsheetId, withIds);

      const sorted = sortByDateTime(withIds);
      setRecords(sorted);
      saveLocal(sorted);

      const newIds = new Set();
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
  }, [tokens, spreadsheetId]);

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

  // 기록 삭제
  const deleteRecord = useCallback((index) => {
    const target = records[index];
    const next = records.filter((_, i) => i !== index);
    setRecords(next);
    saveLocal(next);
    if (target.id) {
      const newIds = new Set(syncedIds);
      newIds.delete(target.id);
      setSyncedIds(newIds);
      saveSyncedIds(newIds);
    }
  }, [records, syncedIds]);

  const login = () => { window.location.href = buildOAuthUrl(); };
  const logout = () => {
    clearTokens();
    setTokens(null);
    setSpreadsheetId('');
    setSyncedIds(new Set());
    localStorage.removeItem(SHEET_ID_KEY);
    localStorage.removeItem(SYNCED_IDS_KEY);
  };

  return {
    records, addRecord, deleteRecord,
    syncWithSheets, uploadLocalToSheets,
    createSpreadsheet,
    tokens, login, logout,
    spreadsheetId,
    syncing, syncError, syncOk,
    hasUnsynced,
  };
}