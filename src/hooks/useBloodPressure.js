// src/hooks/useBloodPressure.js

import { useState, useEffect, useCallback } from 'react';
import { classifyBP, todayStr, nowTimeStr } from '../utils/bpClassify';
import { appendRecord, readAllRecords, uploadAllRecords, createAndInitSpreadsheet, findExistingSpreadsheet } from '../utils/sheetsApi';
import { loadTokens, saveTokens, clearTokens, buildOAuthUrl } from '../utils/googleAuth';

const LOCAL_KEY = 'bp_records';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
  catch { return []; }
}
function saveLocal(records) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
}

const SHEET_ID_KEY = 'bp_spreadsheet_id';

export function useBloodPressure() {
  const [records, setRecords]             = useState(loadLocal);
  const [tokens, setTokens]               = useState(loadTokens);
  const [spreadsheetId, setSpreadsheetId] = useState(
    () => localStorage.getItem(SHEET_ID_KEY) || ''
  );
  const [syncing, setSyncing]       = useState(false);
  const [syncError, setSyncError]   = useState('');
  const [syncOk, setSyncOk]         = useState(false);
  const [hasUnsynced, setHasUnsynced] = useState(false); // ← 추가

  // 로컬 vs 시트 비교해서 hasUnsynced 업데이트
  const checkUnsynced = useCallback((localRecords, remoteRecords) => {
    const remoteKeys = new Set(remoteRecords.map(r => `${r.date}_${r.time}`));
    const unsynced = localRecords.filter(r => !remoteKeys.has(`${r.date}_${r.time}`));
    setHasUnsynced(unsynced.length > 0);
  }, []);

  // OAuth 콜백으로 돌아왔을 때 URL 파라미터 처리
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

  // 토큰은 있는데 spreadsheetId가 없을 때 → 자동 검색
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
        setSyncOk(true);
        setTimeout(() => setSyncOk(false), 2500);
        // Sheets에 바로 저장됐으니 unsynced 없음
        setHasUnsynced(false);
      } catch (e) {
        // Sheets 저장 실패 → 로컬에만 있으니 unsynced
        setSyncError('Sheets 저장 실패: ' + e.message);
        setHasUnsynced(true);
      } finally {
        setSyncing(false);
      }
    } else {
      // 연동 안 된 상태에서 기록 추가 → unsynced
      setHasUnsynced(true);
    }

    return record;
  }, [records, tokens, spreadsheetId]);

  // Sheets에서 전체 기록 가져오기
  const pullFromSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    setSyncing(true);
    setSyncError('');
    try {
      const remote = await readAllRecords(spreadsheetId);
      const all = [...remote];
      const keys = new Set(remote.map(r => `${r.date}_${r.time}`));
      for (const r of records) {
        if (!keys.has(`${r.date}_${r.time}`)) all.push(r);
      }
      all.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      setRecords(all);
      saveLocal(all);
      // 불러온 후 로컬 vs 시트 비교
      checkUnsynced(all, remote);
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('불러오기 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId, records, checkUnsynced]);

  // 로컬에만 있는 것만 업로드
  const pushAllToSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    if (records.length === 0) return;
    setSyncing(true);
    setSyncError('');
    try {
      // 시트에 있는 기록 먼저 읽기
      const remote = await readAllRecords(spreadsheetId);
      const remoteKeys = new Set(remote.map(r => `${r.date}_${r.time}`));

      // 시트에 없는 것만 필터링
      const toUpload = records.filter(r => !remoteKeys.has(`${r.date}_${r.time}`));

      if (toUpload.length === 0) {
        setHasUnsynced(false);
        return;
      }

      await uploadAllRecords(spreadsheetId, toUpload);
      setHasUnsynced(false);
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('업로드 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId, records]);

  // 스프레드시트 자동 생성
  const createSpreadsheet = useCallback(async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const id = await createAndInitSpreadsheet();
      setSpreadsheetId(id);
      localStorage.setItem(SHEET_ID_KEY, id);
      // 새로 생성했으니 로컬 기록은 전부 unsynced
      setHasUnsynced(records.length > 0);
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('생성 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [records.length]);

  const login = () => { window.location.href = buildOAuthUrl(); };
  const logout = () => {
    clearTokens();
    setTokens(null);
    setSpreadsheetId('');
    setHasUnsynced(false);
    localStorage.removeItem(SHEET_ID_KEY);
  };

  return {
    records, addRecord, pullFromSheets, pushAllToSheets, createSpreadsheet,
    tokens, login, logout,
    spreadsheetId, setSpreadsheetId,
    syncing, syncError, syncOk,
    hasUnsynced, // ← 추가
  };
}
