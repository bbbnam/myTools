import { getValidAccessToken } from './googleAuth';

const SPREADSHEET_TITLE = 'MyTools 메모기록';
const MEMOS_TAB = 'memos';
const HEADERS = ['id', 'title', 'date', 'templateType', 'contentJson', 'tags', 'createdAt', 'updatedAt'];

async function callProxy(body) {
  const token = await getValidAccessToken();
  const res = await fetch('/api/sheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sheets API error');
  return data;
}

function safeTab(tabName) {
  return `'${tabName}'`;
}

function serializeTags(tags) {
  return Array.isArray(tags) ? tags.join(',') : String(tags || '');
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

export function rowToMemo(row) {
  let content = {};
  try { content = JSON.parse(row[4] || '{}'); } catch { content = {}; }
  return {
    id: row[0] || '',
    title: row[1] || '',
    date: row[2] || '',
    templateType: row[3] || 'basic',
    content,
    tags: parseTags(row[5]),
    createdAt: row[6] || '',
    updatedAt: row[7] || '',
  };
}

export function memoToRow(memo) {
  return [
    memo.id,
    memo.title || '',
    memo.date || '',
    memo.templateType || 'basic',
    JSON.stringify(memo.content || {}),
    serializeTags(memo.tags),
    memo.createdAt || '',
    memo.updatedAt || '',
  ];
}

export async function initMemoSheet(spreadsheetId) {
  try {
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `${safeTab(MEMOS_TAB)}!A1:H1`,
    });
    const firstRow = result.values?.[0];
    if (firstRow && firstRow[0] === 'id') return;
  } catch {
    try {
      await callProxy({ action: 'create_sheet', spreadsheetId, sheetTitle: MEMOS_TAB });
    } catch {
      // 이미 있을 수 있음
    }
  }

  await callProxy({
    action: 'append',
    spreadsheetId,
    range: `${safeTab(MEMOS_TAB)}!A1`,
    values: [HEADERS],
  });
}

export async function readMemos(spreadsheetId) {
  await initMemoSheet(spreadsheetId);
  const result = await callProxy({
    action: 'read',
    spreadsheetId,
    range: `${safeTab(MEMOS_TAB)}!A2:H`,
  });
  return (result.values || [])
    .map(rowToMemo)
    .filter(memo => memo.id && memo.date)
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
}

export async function overwriteMemos(spreadsheetId, memos) {
  await initMemoSheet(spreadsheetId);
  await callProxy({
    action: 'clear',
    spreadsheetId,
    range: `${safeTab(MEMOS_TAB)}!A2:H`,
  });
  if (!memos.length) return;
  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `${safeTab(MEMOS_TAB)}!A:H`,
    values: memos.map(memoToRow),
  });
}

export async function createMemoSpreadsheet() {
  const token = await getValidAccessToken();
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title: SPREADSHEET_TITLE } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '메모 스프레드시트 생성 실패');
  await initMemoSheet(data.spreadsheetId);
  return data.spreadsheetId;
}

export async function findMemoSpreadsheet() {
  const token = await getValidAccessToken();
  const query = encodeURIComponent(
    `name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '메모 스프레드시트 검색 실패');
  return data.files?.[0]?.id || null;
}
