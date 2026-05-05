import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildOAuthUrl, clearTokens, loadTokens, saveTokens } from '../utils/googleAuth';
import { createMemoSpreadsheet, findMemoSpreadsheet, overwriteMemos, readMemos } from '../utils/memoSheetsApi';

const MEMOS_KEY = 'template_memos';
const SHEET_ID_KEY = 'template_memo_spreadsheet_id';

export const MEMO_TEMPLATES = [
  { id: 'basic', label: '기본 메모', icon: '📝', description: '제목, 본문, 태그 중심의 빠른 기록' },
  { id: 'diary', label: '다이어리', icon: '🌙', description: '기분, 오늘 한 일, 자유 메모' },
  { id: 'blood-pressure', label: '혈압 일기', icon: '❤️', description: '날짜별 혈압 기록을 붙여 쓰는 건강 일기' },
  { id: 'plant', label: '식물 관찰', icon: '🌿', description: '사진 메모를 염두에 둔 관찰 기록' },
  { id: 'animal', label: '동물 관찰', icon: '🐾', description: '위치, 행동, 상태 중심 관찰 기록' },
  { id: 'free', label: '자유 꾸미기', icon: '✨', description: '스티커/도구 배치 정보를 저장할 자유 메모' },
];

export const STICKERS = ['⭐', '❤️', '✅', '🌤️', '💊', '🌿', '🐾', '📌'];
export const TOOLS = ['텍스트 박스', '체크박스', '구분선', '화살표', '동그라미', '밑줄'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadLocalMemos() {
  try { return JSON.parse(localStorage.getItem(MEMOS_KEY)) || []; }
  catch { return []; }
}

function saveLocalMemos(memos) {
  localStorage.setItem(MEMOS_KEY, JSON.stringify(memos));
}

function parseTags(input) {
  return String(input || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function readBpRecordsForDate(date) {
  const month = date.slice(0, 7);
  try {
    return (JSON.parse(localStorage.getItem(`bp_records_${month}`)) || [])
      .filter(record => record.date === date)
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  } catch {
    return [];
  }
}

function buildDefaultContent(templateType, date) {
  const bpRecords = templateType === 'blood-pressure' ? readBpRecordsForDate(date) : [];
  return {
    body: '',
    mood: '',
    todayDone: '',
    condition: '',
    location: '',
    observationTarget: '',
    stickers: [],
    tools: [],
    linkedBloodPressureDate: templateType === 'blood-pressure' ? date : '',
    linkedBloodPressureRecords: bpRecords,
  };
}

function memoText(memo) {
  const content = memo.content || {};
  const bp = (content.linkedBloodPressureRecords || [])
    .map(r => `${r.systolic}/${r.diastolic} ${r.memo || ''}`)
    .join(' ');
  return [
    memo.title,
    memo.date,
    memo.templateType,
    ...(memo.tags || []),
    content.body,
    content.mood,
    content.todayDone,
    content.condition,
    content.location,
    content.observationTarget,
    bp,
  ].join(' ').toLowerCase();
}

export function useTemplateMemos() {
  const [memos, setMemos] = useState(() => loadLocalMemos());
  const [tokens, setTokens] = useState(loadTokens);
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem(SHEET_ID_KEY) || '');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [query, setQuery] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const at = params.get('access_token');
    const rt = params.get('refresh_token');
    const ei = params.get('expires_in');
    if (at) {
      saveTokens({ access_token: at, refresh_token: rt, expires_in: ei });
      setTokens(loadTokens());
      window.history.replaceState({}, '', '/memo');
    }
  }, []);

  useEffect(() => {
    const currentTokens = loadTokens();
    if (!currentTokens || spreadsheetId) return;
    findMemoSpreadsheet()
      .then(id => {
        if (id) {
          setSpreadsheetId(id);
          localStorage.setItem(SHEET_ID_KEY, id);
        }
      })
      .catch(() => {});
  }, [spreadsheetId]);

  const sortedMemos = useMemo(() => {
    return [...memos].sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
  }, [memos]);

  const filteredMemos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedMemos.filter(memo => {
      const templateOk = templateFilter === 'all' || memo.templateType === templateFilter;
      const queryOk = !q || memoText(memo).includes(q);
      return templateOk && queryOk;
    });
  }, [sortedMemos, query, templateFilter]);

  const selectedDateMemos = useMemo(() => {
    return sortedMemos.filter(memo => memo.date === selectedDate);
  }, [sortedMemos, selectedDate]);

  const memoCountByDate = useMemo(() => {
    return memos.reduce((acc, memo) => {
      acc[memo.date] = (acc[memo.date] || 0) + 1;
      return acc;
    }, {});
  }, [memos]);

  const upsertMemo = useCallback(async ({ id, title, date, templateType, tagsText, content }) => {
    const now = new Date().toISOString();
    const nextMemo = {
      id: id || generateId(),
      title: title?.trim() || '제목 없는 메모',
      date: date || todayStr(),
      templateType: templateType || 'basic',
      tags: parseTags(tagsText),
      content: content || {},
      createdAt: id ? (memos.find(m => m.id === id)?.createdAt || now) : now,
      updatedAt: now,
    };
    const next = [nextMemo, ...memos.filter(m => m.id !== nextMemo.id)];
    setMemos(next);
    saveLocalMemos(next);

    if (tokens && spreadsheetId) {
      setSyncing(true);
      try {
        await overwriteMemos(spreadsheetId, next);
        setNotice({ type: 'success', message: '로컬과 Google Sheets에 저장됐습니다.' });
      } catch (e) {
        setNotice({ type: 'warning', message: `로컬 저장 완료. Sheets 저장은 실패했습니다: ${e.message}` });
      } finally {
        setSyncing(false);
      }
    } else {
      setNotice({ type: 'success', message: '로컬에 저장됐습니다. Google 연동 후 Sheets 동기화가 가능합니다.' });
    }
    return nextMemo;
  }, [memos, tokens, spreadsheetId]);

  const deleteMemo = useCallback(async (id) => {
    const next = memos.filter(memo => memo.id !== id);
    setMemos(next);
    saveLocalMemos(next);
    if (tokens && spreadsheetId) {
      setSyncing(true);
      try { await overwriteMemos(spreadsheetId, next); }
      catch (e) { setNotice({ type: 'warning', message: `로컬 삭제 완료. Sheets 반영 실패: ${e.message}` }); }
      finally { setSyncing(false); }
    }
  }, [memos, tokens, spreadsheetId]);

  const login = useCallback(() => { window.location.href = buildOAuthUrl(); }, []);

  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem(SHEET_ID_KEY);
    setTokens(null);
    setSpreadsheetId('');
    setNotice({ type: 'success', message: 'Google 연결을 해제했습니다.' });
  }, []);

  const ensureSpreadsheet = useCallback(async () => {
    if (!tokens) return null;
    if (spreadsheetId) return spreadsheetId;
    setSyncing(true);
    try {
      const found = await findMemoSpreadsheet();
      const id = found || await createMemoSpreadsheet();
      setSpreadsheetId(id);
      localStorage.setItem(SHEET_ID_KEY, id);
      setNotice({ type: 'success', message: found ? '기존 메모 시트를 연결했습니다.' : '메모 시트를 생성했습니다.' });
      return id;
    } finally {
      setSyncing(false);
    }
  }, [tokens, spreadsheetId]);

  const uploadToSheets = useCallback(async () => {
    const id = await ensureSpreadsheet();
    if (!id) return;
    setSyncing(true);
    try {
      await overwriteMemos(id, memos);
      setNotice({ type: 'success', message: '현재 메모를 Google Sheets에 업로드했습니다.' });
    } catch (e) {
      setNotice({ type: 'warning', message: `업로드 실패: ${e.message}` });
    } finally {
      setSyncing(false);
    }
  }, [ensureSpreadsheet, memos]);

  const downloadFromSheets = useCallback(async () => {
    const id = await ensureSpreadsheet();
    if (!id) return;
    setSyncing(true);
    try {
      const remote = await readMemos(id);
      setMemos(remote);
      saveLocalMemos(remote);
      setNotice({ type: 'success', message: `Google Sheets에서 ${remote.length}개 메모를 불러왔습니다.` });
    } catch (e) {
      setNotice({ type: 'warning', message: `불러오기 실패: ${e.message}` });
    } finally {
      setSyncing(false);
    }
  }, [ensureSpreadsheet]);

  return {
    memos: sortedMemos,
    filteredMemos,
    selectedDate,
    setSelectedDate,
    selectedDateMemos,
    memoCountByDate,
    query,
    setQuery,
    templateFilter,
    setTemplateFilter,
    upsertMemo,
    deleteMemo,
    buildDefaultContent,
    readBpRecordsForDate,
    tokens,
    spreadsheetId,
    login,
    logout,
    syncing,
    notice,
    setNotice,
    ensureSpreadsheet,
    uploadToSheets,
    downloadFromSheets,
  };
}
