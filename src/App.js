import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { routes } from './routes';
import BottomNav from './components/common/BottomNav';
import HomePage from './pages/HomePage';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 홈 (메뉴 허브) */}
        <Route path="/" element={<HomePage />} />

        {/* routes.js에 등록된 메뉴들 자동 렌더링 */}
        {routes.map(route =>
          route.enabled ? (
            <Route
              key={route.id}
              path={route.path}
              element={<route.component />}
            />
          ) : null
        )}

        {/* 없는 경로는 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </BrowserRouter>
  );
}
