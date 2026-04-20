// src/hooks/useBloodPressure.js

import { useState, useEffect, useCallback } from 'react';
import { classifyBP, todayStr, nowTimeStr } from '../utils/bpClassify';
import { appendRecord, readAllRecords, uploadAllRecords, createAndInitSpreadsheet, findExistingSpreadsheet } from '../utils/sheetsApi';
import { loadTokens, saveTokens, clearTokens, buildOAuthUrl } from '../utils/googleAuth';

const LOCAL_KEY = 'bp_records';
const SHEET_ID_KEY = 'bp_spreadsheet_id';
const SYNCED_KEYS_KEY = 'bp_synced_keys';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
  catch { return []; }
}
function saveLocal(records) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
}
function loadSyncedKeys() {
  try { return new Set(JSON.parse(localStorage.getItem(SYNCED_KEYS_KEY)) || []); }
  catch { return new Set(); }
}
function saveSyncedKeys(keys) {
  localStorage.setItem(SYNCED_KEYS_KEY, JSON.stringify([...keys]));
}

// 두 기록이 같은지 비교 — date + systolic + diastolic 기준 (time 형식 차이 무시)
function isSameRecord(a, b) {
  return a.date === b.date &&
    Number(a.systolic)  === Number(b.systolic) &&
    Number(a.diastolic) === Number(b.diastolic) &&
    (a.time || '').replace(/^0/, '') === (b.time || '').replace(/^0/, '');
}

export function useBloodPressure() {
  const [records, setRecords]           = useState(loadLocal);
  const [tokens, setTokens]             = useState(loadTokens);
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem(SHEET_ID_KEY) || ''
  );
  const [syncing, setSyncing]       = useState(false);
  const [syncError, setSyncError]   = useState('');
  const [syncOk, setSyncOk]         = useState(false);
  const [syncedKeys, setSyncedKeys] = useState(loadSyncedKeys);

  const hasUnsynced = records.some(r => !syncedKeys.has(`${r.date}_${r.time}`));

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

    const next = [record, ...records];
    setRecords(next);
    saveLocal(next);

    if (tokens && spreadsheetId) {
      setSyncing(true);
      setSyncError('');
      try {
        await appendRecord(spreadsheetId, record);
        const newKeys = new Set(syncedKeys);
        newKeys.add(`${record.date}_${record.time}`);
        setSyncedKeys(newKeys);
        saveSyncedKeys(newKeys);
        setSyncOk(true);
        setTimeout(() => setSyncOk(false), 2500);
      } catch (e) {
        setSyncError('Sheets 저장 실패: ' + e.message);
      } finally {
        setSyncing(false);
      }
    }

    return record;
  }, [records, tokens, spreadsheetId, syncedKeys]);

  // Sheets에서 불러오기
  const pullFromSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setSyncing(true);
    setSyncError('');
    try {
      const remote = await readAllRecords(spreadsheetId);
      const currentRecords = loadLocal();

      // 로컬에만 있는 것 = 시트 기록 중 어느 것과도 매칭 안 되는 것
      const localOnly = currentRecords.filter(local =>
        !remote.some(r => isSameRecord(local, r))
      );

      const all = [...remote, ...localOnly];
      all.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

      setRecords(all);
      saveLocal(all);

      // 전체 syncedKeys 갱신
      const newKeys = new Set();
      all.forEach(r => newKeys.add(`${r.date}_${r.time}`));
      setSyncedKeys(newKeys);
      saveSyncedKeys(newKeys);

      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('불러오기 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId]);

  // 로컬에만 있는 것만 업로드
  const pushAllToSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId || !hasUnsynced) return;
    setSyncing(true);
    setSyncError('');
    try {
      const remote = await readAllRecords(spreadsheetId);
      const toUpload = records.filter(local =>
        !remote.some(r => isSameRecord(local, r))
      );

      if (toUpload.length > 0) {
        await uploadAllRecords(spreadsheetId, toUpload);
      }

      // 전체 syncedKeys 갱신
      const newKeys = new Set();
      records.forEach(r => newKeys.add(`${r.date}_${r.time}`));
      remote.forEach(r => newKeys.add(`${r.date}_${r.time}`));
      setSyncedKeys(newKeys);
      saveSyncedKeys(newKeys);

      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('업로드 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId, records, hasUnsynced]);

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
    const newKeys = new Set(syncedKeys);
    newKeys.delete(`${target.date}_${target.time}`);
    setSyncedKeys(newKeys);
    saveSyncedKeys(newKeys);
  }, [records, syncedKeys]);

  const login = () => { window.location.href = buildOAuthUrl(); };
  const logout = () => {
    clearTokens();
    setTokens(null);
    setSpreadsheetId('');
    setSyncedKeys(new Set());
    localStorage.removeItem(SHEET_ID_KEY);
    localStorage.removeItem(SYNCED_KEYS_KEY);
  };

  return {
    records, addRecord, deleteRecord, pullFromSheets, pushAllToSheets, createSpreadsheet,
    tokens, login, logout,
    spreadsheetId, setSpreadsheetId,
    syncing, syncError, syncOk,
    hasUnsynced,
  };
}