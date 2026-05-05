// ============================================================
// routes.js — 앱의 모든 메뉴/페이지를 여기서 등록합니다.
// 새 기능 추가 시: 이 배열에 항목 하나만 추가하면 끝!
// ============================================================

import LedBoardPage      from './pages/LedBoardPage';
import BloodPressurePage from './pages/BloodPressurePage';
import TemplateMemoPage  from './pages/TemplateMemoPage';

export const routes = [
  {
    id: 'led-board',
    path: '/led',
    label: 'LED 전광판',
    icon: '📺',
    description: '텍스트를 LED 전광판으로 표시',
    component: LedBoardPage,
    enabled: true,
  },
  {
    id: 'blood-pressure',
    path: '/bp',
    label: '혈압 기록',
    icon: '❤️',
    description: '혈압·몸무게 기록 및 Google Sheets 연동',
    component: BloodPressurePage,
    enabled: true,
  },
  {
    id: 'template-memo',
    path: '/memo',
    label: '템플릿 메모',
    icon: '📝',
    description: '템플릿 기반 다이어리 메모와 검색/달력 조회',
    component: TemplateMemoPage,
    enabled: true,
  },
];