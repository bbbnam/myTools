import React, { useEffect } from 'react';
import LedDisplay from './LedDisplay';
import './LedFullscreen.css';

export default function LedFullscreen({ open, onClose, ...displayProps }) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 화면 잠금 방지
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="led-fullscreen" onClick={onClose}>
      <div className="led-fullscreen__inner" onClick={e => e.stopPropagation()}>
        <LedDisplay {...displayProps} />
        <button className="led-fullscreen__close" onClick={onClose}>
          ✕ 닫기
        </button>
      </div>
    </div>
  );
}
