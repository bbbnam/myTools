// src/utils/sheetsApi.js

import { getValidAccessToken } from './googleAuth';

const SPREADSHEET_TITLE = 'MyTools 혈압기록';
const HEADERS = ['id', '날짜', '시간', '시간대', '수축기(mmHg)', '이완기(mmHg)', '맥박(bpm)', '몸무게(kg)', '혈압단계', '메모'];

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

// 탭 이름을 range에서 안전하게 사용하도록 작은따옴표로 감쌈
function safeTab(tabName) {
  return `'${tabName}'`;
}

export function getSheetTabName(yearMonth) {
  return yearMonth;
}

// 스프레드시트의 모든 탭 목록 조회
export async function getSheetTabs(spreadsheetId) {
  const token = await getValidAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '탭 목록 조회 실패');

  const tabs = data.sheets?.map(s => s.properties.title) || [];
  return tabs
    .filter(t => /^\d{4}-\d{2}$/.test(t))
    .sort()
    .reverse();
}

export async function initMonthSheet(spreadsheetId, yearMonth) {
  const tabName = getSheetTabName(yearMonth);

  try {
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `${safeTab(tabName)}!A1:J1`,
    });
    const firstRow = result.values?.[0];
    if (firstRow && firstRow[0] === 'id') return;
  } catch {
    try {
      await callProxy({ action: 'create_sheet', spreadsheetId, sheetTitle: tabName });
    } catch {
      // 이미 있을 수도 있음
    }
  }

  await callProxy({
    action: 'append',
    spreadsheetId,
    range: `${safeTab(tabName)}!A1`,
    values: [HEADERS],
  });
}

export async function appendRecord(spreadsheetId, record) {
  const yearMonth = record.date.slice(0, 7);
  await initMonthSheet(spreadsheetId, yearMonth);
  const tabName = getSheetTabName(yearMonth);

  const row = [
    record.id,
    record.date,
    record.time,
    record.timeSlot,
    record.systolic,
    record.diastolic,
    record.pulse,
    record.weight || '',
    record.bpLevel,
    record.memo || '',
  ];
  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `${safeTab(tabName)}!A:J`,
    values: [row],
  });
}

export async function readMonthRecords(spreadsheetId, yearMonth) {
  const tabName = getSheetTabName(yearMonth);
  try {
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `${safeTab(tabName)}!A2:J`,
    });
    const rows = result.values || [];
    return rows.map(r => ({
      id:        r[0] || '',
      date:      r[1] || '',
      time:      r[2] || '',
      timeSlot:  r[3] || '',
      systolic:  Number(r[4]) || 0,
      diastolic: Number(r[5]) || 0,
      pulse:     Number(r[6]) || 0,
      weight:    r[7] ? Number(r[7]) : null,
      bpLevel:   r[8] || '',
      memo:      r[9] || '',
    })).filter(r => r.date && r.systolic);
  } catch {
    return [];
  }
}

export async function overwriteMonthRecords(spreadsheetId, yearMonth, records) {
  const tabName = getSheetTabName(yearMonth);
  await initMonthSheet(spreadsheetId, yearMonth);

  await callProxy({
    action: 'clear',
    spreadsheetId,
    range: `${safeTab(tabName)}!A2:J`,
  });

  if (records.length === 0) return;

  const rows = records.map(r => [
    r.id, r.date, r.time, r.timeSlot,
    r.systolic, r.diastolic, r.pulse || '',
    r.weight || '', r.bpLevel || '', r.memo || '',
  ]);

  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `${safeTab(tabName)}!A:J`,
    values: rows,
  });
}

export async function uploadMonthRecords(spreadsheetId, yearMonth, records) {
  await initMonthSheet(spreadsheetId, yearMonth);
  const tabName = getSheetTabName(yearMonth);

  const rows = records.map(r => [
    r.id, r.date, r.time, r.timeSlot,
    r.systolic, r.diastolic, r.pulse || '',
    r.weight || '', r.bpLevel || '', r.memo || '',
  ]);

  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `${safeTab(tabName)}!A:J`,
    values: rows,
  });
}

export async function createAndInitSpreadsheet() {
  const token = await getValidAccessToken();
  const authHeader = `Bearer ${token}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title: SPREADSHEET_TITLE } }),
  });

  const created = await createRes.json();
  if (!createRes.ok) throw new Error(created.error?.message || '스프레드시트 생성 실패');

  return created.spreadsheetId;
}

export async function findExistingSpreadsheet() {
  const token = await getValidAccessToken();

  const query = encodeURIComponent(
    `name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || '검색 실패');

  return data.files?.[0]?.id || null;
}