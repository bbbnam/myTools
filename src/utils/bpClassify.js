// src/utils/bpClassify.js
// 미국심장학회(AHA) 기준 혈압 단계 분류

export const BP_LEVELS = [
  {
    id: 'normal',
    label: '정상',
    color: '#00c853',
    glow: 'rgba(0,200,83,0.5)',
    check: (sys, dia) => sys < 120 && dia < 80,
  },
  {
    id: 'elevated',
    label: '주의혈압',
    color: '#ffd600',
    glow: 'rgba(255,214,0,0.5)',
    check: (sys, dia) => sys >= 120 && sys <= 129 && dia < 80,
  },
  {
    id: 'high1',
    label: '고혈압 1단계',
    color: '#ff6d00',
    glow: 'rgba(255,109,0,0.5)',
    check: (sys, dia) => (sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89),
  },
  {
    id: 'high2',
    label: '고혈압 2단계',
    color: '#d50000',
    glow: 'rgba(213,0,0,0.6)',
    check: (sys, dia) => sys >= 140 || dia >= 90,
  },
  {
    id: 'crisis',
    label: '고혈압 위기',
    color: '#aa00ff',
    glow: 'rgba(170,0,255,0.6)',
    check: (sys, dia) => sys > 180 || dia > 120,
  },
];

export function classifyBP(systolic, diastolic) {
  const crisis = BP_LEVELS.find(l => l.id === 'crisis');
  if (crisis.check(systolic, diastolic)) return crisis;
  return BP_LEVELS.find(l => l.check(systolic, diastolic)) || BP_LEVELS[0];
}

export const TIME_SLOTS = [
  { id: 'morning',   label: '아침', icon: '🌅' },
  { id: 'afternoon', label: '낮',   icon: '☀️' },
  { id: 'evening',   label: '저녁', icon: '🌙' },
  { id: 'other',     label: '기타', icon: '⏰' },
];

export function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeStr() {
  return new Date().toTimeString().slice(0, 5);
}

// ← 추가: 고유 ID 생성
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}