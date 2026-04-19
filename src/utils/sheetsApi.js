// src/utils/sheetsApi.js

import { getValidAccessToken } from './googleAuth';

const SHEET_NAME = '혈압기록';
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
    // 헤더 행이 있는지 확인
    const result = await callProxy({
      action: 'read',
      spreadsheetId,
      range: `${SHEET_NAME}!A1:I1`,
    });
    const firstRow = result.values?.[0];
    if (firstRow && firstRow[0] === '날짜') return; // 이미 초기화됨
  } catch {
    // 시트가 없으면 생성
    try {
      await callProxy({ action: 'create_sheet', spreadsheetId });
    } catch {
      // 이미 있을 수도 있음 — 무시
    }
  }

  // 헤더 삽입
  await callProxy({
    action: 'append',
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
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
    range: `${SHEET_NAME}!A:I`,
    values: [row],
  });
}

// 전체 기록 읽기
export async function readAllRecords(spreadsheetId) {
  const result = await callProxy({
    action: 'read',
    spreadsheetId,
    range: `${SHEET_NAME}!A2:I`,  // 헤더 제외
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
