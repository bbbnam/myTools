// ============================================================
// routes.js — 앱의 모든 메뉴/페이지를 여기서 등록합니다.
// 새 기능 추가 시: 이 배열에 항목 하나만 추가하면 끝!
// ============================================================

import LedBoardPage from './pages/LedBoardPage';
// import BloodPressurePage from '../pages/BloodPressurePage'; // 나중에 추가

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
  // 아래 형식으로 새 메뉴 추가:
  // {
  //   id: 'blood-pressure',
  //   path: '/bp',
  //   label: '혈압 기록',
  //   icon: '❤️',
  //   description: '혈압을 날짜별로 기록하고 관리',
  //   component: BloodPressurePage,
  //   enabled: false, // false면 "준비중" 표시
  // },
];
