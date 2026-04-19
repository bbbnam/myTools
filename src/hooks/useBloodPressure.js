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
  const [syncing, setSyncing]     = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncOk, setSyncOk]       = useState(false);

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

      // 로그인 직후 기존 시트 자동 검색
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
  // (다른 기기에서 접속하거나 localStorage가 초기화된 경우)
  useEffect(() => {
    const currentTokens = loadTokens();
    if (currentTokens && !spreadsheetId) {
      findExistingSpreadsheet()
        .then(id => {
          if (id) {
            setSpreadsheetId(id);
            localStorage.setItem(SHEET_ID_KEY, id);
          }
        })
        .catch(() => {});
    }
  }, [tokens]); // tokens 바뀔 때마다 실행

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

    // Sheets 동기화
    if (tokens && spreadsheetId) {
      setSyncing(true);
      setSyncError('');
      try {
        await appendRecord(spreadsheetId, record);
        setSyncOk(true);
        setTimeout(() => setSyncOk(false), 2500);
      } catch (e) {
        setSyncError('Sheets 저장 실패: ' + e.message);
      } finally {
        setSyncing(false);
      }
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
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('불러오기 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId, records]);

  const pushAllToSheets = useCallback(async () => {
    if (!tokens || !spreadsheetId) return;
    if (records.length === 0) return;
    setSyncing(true);
    setSyncError('');
    try {
      await uploadAllRecords(spreadsheetId, records);
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
      setSyncOk(true);
      setTimeout(() => setSyncOk(false), 2500);
    } catch (e) {
      setSyncError('생성 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  const login = () => { window.location.href = buildOAuthUrl(); };
  const logout = () => {
    clearTokens();
    setTokens(null);
    setSpreadsheetId('');
    localStorage.removeItem(SHEET_ID_KEY);
  };

  return {
    records, addRecord, pullFromSheets, pushAllToSheets, createSpreadsheet,
    tokens, login, logout,
    spreadsheetId, setSpreadsheetId,
    syncing, syncError, syncOk,
  };
}