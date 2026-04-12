import React from 'react';
import './LedDisplay.css';

// LED 컬러 테마 정의
export const LED_COLORS = [
  { id: 'red',    label: '빨강', color: '#ff3d00', glow: 'rgba(255,61,0,0.7)' },
  { id: 'green',  label: '초록', color: '#00ff88', glow: 'rgba(0,255,136,0.7)' },
  { id: 'blue',   label: '파랑', color: '#00aaff', glow: 'rgba(0,170,255,0.7)' },
  { id: 'yellow', label: '노랑', color: '#ffe600', glow: 'rgba(255,230,0,0.7)' },
  { id: 'white',  label: '흰색', color: '#ffffff', glow: 'rgba(255,255,255,0.6)' },
  { id: 'pink',   label: '분홍', color: '#ff4da6', glow: 'rgba(255,77,166,0.7)' },
];

export const SPEEDS = [
  { id: 'slow',   label: '느리게', duration: 18 },
  { id: 'normal', label: '보통',   duration: 10 },
  { id: 'fast',   label: '빠르게', duration: 5  },
];

export const FONT_SIZES = [
  { id: 'sm', label: '작게',   px: 48  },
  { id: 'md', label: '보통',   px: 80  },
  { id: 'lg', label: '크게',   px: 120 },
  { id: 'xl', label: '초대형', px: 160 },
];

export default function LedDisplay({ text, colorId, speedId, fontSizeId, isScrolling }) {
  const color  = LED_COLORS.find(c => c.id === colorId)  || LED_COLORS[0];
  const speed  = SPEEDS.find(s => s.id === speedId)       || SPEEDS[1];
  const size   = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[1];

  const rawText = text.trim() || '텍스트를 입력하세요';
  const scrollText = rawText.replace(/\n+/g, '   ·   ');
  const staticLines = rawText.split('\n');

  return (
    <div className="led-display" style={{ '--led-color': color.color, '--led-glow': color.glow }}>
      {/* 스캔라인 오버레이 */}
      <div className="led-display__scanlines" />

      {/* LED 픽셀 도트 오버레이 */}
      <div className="led-display__dots" />

      {/* 텍스트 영역 */}
      <div className="led-display__stage">
        {isScrolling ? (
          <div
            className="led-display__ticker"
            style={{
              fontSize: `${size.px}px`,
              animationDuration: `${speed.duration}s`,
            }}
          >
            <span>{scrollText}</span>
          </div>
        ) : (
          <div
            className="led-display__static"
            style={{ fontSize: `${size.px}px` }}
          >
            {staticLines.map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < staticLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* 코너 데코 */}
      <span className="led-display__corner led-display__corner--tl" />
      <span className="led-display__corner led-display__corner--tr" />
      <span className="led-display__corner led-display__corner--bl" />
      <span className="led-display__corner led-display__corner--br" />
    </div>
  );
}
