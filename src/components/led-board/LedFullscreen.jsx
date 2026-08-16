import React, { useEffect, useRef, useState } from 'react';
import { LED_COLORS, SPEEDS, FONTS } from './LedDisplay';
import { useAutoFitFontSize } from '../../hooks/useAutoFitFontSize';
import './LedFullscreen.css';

const HINT_DURATION = 3000;
// 세로 화면은 꽉 채우면 답답해서 여백을 남긴다 (가로는 한 줄이라 꽉 채워도 잘 읽힘)
const PORTRAIT_SCALE = 0.85;
const WRAP_CLASS = 'led-fullscreen__text--wrap';

// 우리가 직접 되돌린 history.back()이 만든 popstate는 무시해야 한다.
// (StrictMode 이중 마운트, 닫자마자 다시 열기 등에서 스스로 닫히는 것을 막는다)
let pendingBack = 0;

// 열릴 때마다 새로 마운트해야 크기 측정 훅이 살아있는 ref를 잡는다
export default function LedFullscreen({ open, ...rest }) {
  if (!open) return null;
  return <FullscreenView {...rest} />;
}

function FullscreenView({ onClose, text, colorId, speedId, fontId, isScrolling }) {
  const containerRef = useRef(null);
  const stageRef     = useRef(null);
  const textRef      = useRef(null);

  const [showHint, setShowHint] = useState(true);

  const color = LED_COLORS.find(c => c.id === colorId) || LED_COLORS[0];
  const speed = SPEEDS.find(s => s.id === speedId)     || SPEEDS[1];
  const font  = FONTS.find(f => f.id === fontId)       || FONTS[0];

  const rawText     = text.trim() || '텍스트를 입력하세요';
  const scrollText  = rawText.replace(/\n+/g, '   ·   ');
  const staticLines = rawText.split('\n');

  // 전체화면에서는 글자 크기 설정 대신 화면에 꽉 차는 최대 크기를 계산해서 쓴다.
  // 방향 판정도 훅이 실제 화면 크기로 하므로 회전 순서와 무관하게 일관된다.
  const { fontSize: fittedSize, isLandscape } = useAutoFitFontSize({
    containerRef: stageRef,
    textRef,
    isScrolling,
    portraitScale: PORTRAIT_SCALE,
    wrapClass: WRAP_CLASS,
    signature: `${rawText}|${fontId}|${isScrolling}`,
  });

  // 세로 화면은 줄바꿈 허용, 가로 화면은 한 줄 유지
  const wrapText = !isScrolling && !isLandscape;

  // 네이티브 전체화면 요청
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // 폰 뒤로가기가 페이지를 벗어나지 않고 전체화면만 닫도록 히스토리 항목을 하나 넣어둔다
  useEffect(() => {
    window.history.pushState({ ledFullscreen: true }, '');

    const onPop = () => {
      if (pendingBack > 0) { pendingBack -= 1; return; }   // 우리가 되돌린 것
      onClose();                                            // 사용자가 누른 뒤로가기
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // 터치/ESC로 닫은 경우엔 직접 넣은 항목이 남아있으므로 되돌린다
      if (window.history.state?.ledFullscreen) {
        pendingBack += 1;
        window.history.back();
      }
    };
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // 닫는 방법 안내는 잠깐만 보여주고 사라진다
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), HINT_DURATION);
    return () => clearTimeout(t);
  }, []);

  const textStyle = {
    fontFamily: font.family,
    color: color.color,
    textShadow: `0 0 10px ${color.glow}, 0 0 30px ${color.glow}, 0 0 60px ${color.glow}`,
    // 측정 전 첫 프레임에 엉뚱한 크기가 번쩍이지 않도록 숨긴다
    fontSize: fittedSize ? `${fittedSize}px` : '10px',
    visibility: fittedSize ? 'visible' : 'hidden',
  };

  return (
    <div
      ref={containerRef}
      className="led-fullscreen"
      style={{ '--led-color': color.color, '--led-glow': color.glow }}
      onClick={onClose}
    >
      <div className="led-fullscreen__stage" ref={stageRef}>
        {isScrolling ? (
          <div
            ref={textRef}
            className="led-fullscreen__ticker"
            style={{ ...textStyle, animationDuration: `${speed.duration}s` }}
          >
            <span>{scrollText}</span>
          </div>
        ) : (
          <div
            ref={textRef}
            className={`led-fullscreen__text${wrapText ? ` ${WRAP_CLASS}` : ''}`}
            style={textStyle}
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

      {showHint && <div className="led-fullscreen__hint">화면을 터치하면 닫힘</div>}
    </div>
  );
}
