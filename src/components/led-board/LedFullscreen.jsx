import React, { useEffect, useRef } from 'react';
import { LED_COLORS, SPEEDS, FONT_SIZES, FONTS } from './LedDisplay';
import './LedFullscreen.css';

export default function LedFullscreen({ open, onClose, text, colorId, speedId, fontSizeId, fontId, isScrolling }) {
  const containerRef = useRef(null);

  const color = LED_COLORS.find(c => c.id === colorId)   || LED_COLORS[0];
  const speed = SPEEDS.find(s => s.id === speedId)        || SPEEDS[1];
  const size  = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[1];
  const font  = FONTS.find(f => f.id === fontId)          || FONTS[0];

  // 네이티브 전체화면 요청
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el?.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
    return () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const rawText = text.trim() || '텍스트를 입력하세요';
  const scrollText = rawText.replace(/\n+/g, '   ·   ');
  const staticLines = rawText.split('\n');

  const textStyle = {
    fontSize: `${size.px}px`,
    fontFamily: font.family,
    color: color.color,
    textShadow: `0 0 10px ${color.glow}, 0 0 30px ${color.glow}, 0 0 60px ${color.glow}`,
  };

  return (
    <div
      ref={containerRef}
      className="led-fullscreen"
      style={{ '--led-color': color.color, '--led-glow': color.glow }}
    >
      <div className="led-fullscreen__stage">
        {isScrolling ? (
          <div
            className="led-fullscreen__ticker"
            style={{ ...textStyle, animationDuration: `${speed.duration}s` }}
          >
            <span>{scrollText}</span>
          </div>
        ) : (
          <div className="led-fullscreen__text" style={textStyle}>
            {staticLines.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < staticLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <button className="led-fullscreen__close" onClick={onClose}>
        ✕ 닫기
      </button>
    </div>
  );
}
