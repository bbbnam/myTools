// src/utils/sheetsApi.js

import { getValidAccessToken } from './googleAuth';

const SPREADSHEET_TITLE = 'MyTools 혈압기록';
// id 컬럼 맨 앞에 추가 (A열)
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

// 시트 초기화 (헤더 삽입) — 최초 1회
export async function initSheet(spreadsheetId) {
  try {
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `A1:J1`,
    });
    const firstRow = result.values?.[0];
    // id 컬럼이 있는 새 헤더 형식인지 확인
    if (firstRow && firstRow[0] === 'id') return;
  } catch {
    // 읽기 실패해도 무시
  }

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
    record.id,          // A: id
    record.date,        // B: 날짜
    record.time,        // C: 시간
    record.timeSlot,    // D: 시간대
    record.systolic,    // E: 수축기
    record.diastolic,   // F: 이완기
    record.pulse,       // G: 맥박
    record.weight || '', // H: 몸무게
    record.bpLevel,     // I: 혈압단계
    record.memo || '',  // J: 메모
  ];
  return callProxy({
    action: 'append',
    spreadsheetId,
    range: `A:J`,
    values: [row],
  });
}

// 전체 기록 읽기
export async function readAllRecords(spreadsheetId) {
  const result = await callProxy({
    action: 'read',
    spreadsheetId,
    range: `A2:J`,
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
}

// 로컬 기록 전체를 Sheets에 업로드
export async function uploadAllRecords(spreadsheetId, records) {
  await initSheet(spreadsheetId);

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
    range: `A:J`,
    values: rows,
  });
}

// 스프레드시트 자동 생성 + 헤더 세팅
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

  const spreadsheetId = created.spreadsheetId;

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