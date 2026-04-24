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

// 월별 탭 이름 생성 (예: "2025-04")
export function getSheetTabName(yearMonth) {
  return yearMonth; // "2025-04" 형식 그대로 사용
}

// 특정 월 탭 초기화 (없으면 생성 + 헤더 삽입)
export async function initMonthSheet(spreadsheetId, yearMonth) {
  const tabName = getSheetTabName(yearMonth);

  // 탭 존재 여부 확인
  try {
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `${tabName}!A1:J1`,
    });
    const firstRow = result.values?.[0];
    if (firstRow && firstRow[0] === 'id') return; // 이미 초기화됨
  } catch {
    // 탭 없음 → 생성
    try {
      await callProxy({ action: 'create_sheet', spreadsheetId, sheetTitle: tabName });
    } catch {
      // 이미 있을 수도 있음 → 무시
    }
  }

  // 헤더 삽입
  await callProxy({
    action: 'append',
    spreadsheetId,
    range: `${tabName}!A1`,
    values: [HEADERS],
  });
}

// 특정 월 기록 1건 추가
export async function appendRecord(spreadsheetId, record) {
  const yearMonth = record.date.slice(0, 7); // "2025-04"
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
    range: `${tabName}!A:J`,
    values: [row],
  });
}

// 특정 월 기록 읽기
export async function readMonthRecords(spreadsheetId, yearMonth) {
  const tabName = getSheetTabName(yearMonth);
  try {
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `${tabName}!A2:J`,
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
    return []; // 해당 월 탭 없으면 빈 배열
  }
}

// 특정 월 기록 전체 덮어쓰기 (삭제 반영용)
export async function overwriteMonthRecords(spreadsheetId, yearMonth, records) {
  const tabName = getSheetTabName(yearMonth);
  await initMonthSheet(spreadsheetId, yearMonth);

  // 기존 데이터 영역 클리어 후 재작성
  await callProxy({
    action: 'clear',
    spreadsheetId,
    range: `${tabName}!A2:J`,
  });

  if (records.length === 0) return;

  const rows = records.map(r => [
    r.id,
    r.date,
    r.time,
    r.timeSlot,
    r.systolic,
    r.diastolic,
    r.pulse || '',
    r.weight || '',
    r.bpLevel || '',
    r.memo || '',
  ]);

  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `${tabName}!A:J`,
    values: rows,
  });
}

// 특정 월 기록 업로드
export async function uploadMonthRecords(spreadsheetId, yearMonth, records) {
  await initMonthSheet(spreadsheetId, yearMonth);
  const tabName = getSheetTabName(yearMonth);

  const rows = records.map(r => [
    r.id,
    r.date,
    r.time,
    r.timeSlot,
    r.systolic,
    r.diastolic,
    r.pulse || '',
    r.weight || '',
    r.bpLevel || '',
    r.memo || '',
  ]);

  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `${tabName}!A:J`,
    values: rows,
  });
}

// 스프레드시트 자동 생성
export async function createAndInitSpreadsheet() {
  const token = await getValidAccessToken();
  const authHeader = `Bearer ${token}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SPREADSHEET_TITLE },
    }),
  });

  const created = await createRes.json();
  if (!createRes.ok) throw new Error(created.error?.message || '스프레드시트 생성 실패');

  return created.spreadsheetId;
}

// 기존 스프레드시트 찾기
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