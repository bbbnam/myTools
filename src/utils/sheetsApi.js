// src/utils/sheetsApi.js

import { getValidAccessToken } from './googleAuth';

const SPREADSHEET_TITLE = 'MyTools 혈압기록';
const HEADERS = ['날짜', '시간', '시간대', '수축기(mmHg)', '이완기(mmHg)', '맥박(bpm)', '몸무게(kg)', '혈압단계', '메모'];

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

// 시트 초기화 (헤더 삽입) — 최초 1회
export async function initSheet(spreadsheetId) {
  try {
    // 헤더 행이 있는지 확인 (시트명 없이 → 첫 번째 탭 자동 선택)
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `A1:I1`,
    });
    const firstRow = result.values?.[0];
    if (firstRow && firstRow[0] === '날짜') return; // 이미 초기화됨
  } catch {
    // 읽기 실패해도 무시하고 헤더 삽입 시도
  }

  // 헤더 삽입
  await callProxy({
    action: 'append',
    spreadsheetId,
    range: `A1`,
    values: [HEADERS],
  });
}

// 혈압 기록 1건 추가
export async function appendRecord(spreadsheetId, record) {
  await initSheet(spreadsheetId);
  const row = [
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
    range: `A:I`,
    values: [row],
  });
}

// 전체 기록 읽기
export async function readAllRecords(spreadsheetId) {
  const result = await callProxy({
    action: 'read',
    spreadsheetId,
    range: `A2:I`, // 헤더 제외, 첫 번째 탭 자동 선택
  });

  const rows = result.values || [];
  return rows.map(r => ({
    date:      r[0] || '',
    time:      r[1] || '',
    timeSlot:  r[2] || '',
    systolic:  Number(r[3]) || 0,
    diastolic: Number(r[4]) || 0,
    pulse:     Number(r[5]) || 0,
    weight:    r[6] ? Number(r[6]) : null,
    bpLevel:   r[7] || '',
    memo:      r[8] || '',
  })).filter(r => r.date && r.systolic);
}

// 로컬 기록 전체를 Sheets에 업로드
export async function uploadAllRecords(spreadsheetId, records) {
  await initSheet(spreadsheetId);

  const rows = records.map(r => [
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
    range: `A:I`,
    values: rows,
  });
}

// 스프레드시트 자동 생성 + 헤더 세팅
export async function createAndInitSpreadsheet() {
  const token = await getValidAccessToken();
  const authHeader = `Bearer ${token}`;

  // 1. 스프레드시트 생성 (첫 번째 탭은 기본 "Sheet1" 또는 "시트1" 로 자동 생성)
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

  const spreadsheetId = created.spreadsheetId;

  // 2. 헤더 삽입 (첫 번째 탭 자동 선택)
  await callProxy({
    action: 'append',
    spreadsheetId,
    range: `A1`,
    values: [HEADERS],
  });

  return spreadsheetId;
}

// 기존에 생성된 "MyTools 혈압기록" 시트 찾기
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
