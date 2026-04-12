import React, { useState } from 'react';
import { LED_COLORS, SPEEDS, FONT_SIZES, FONTS } from './LedDisplay';
import './LedControls.css';

export default function LedControls({
  text, setText,
  colorId, setColorId,
  speedId, setSpeedId,
  fontSizeId, setFontSizeId,
  fontId, setFontId,
  isScrolling, setIsScrolling,
  onFullscreen,
}) {
  const [draftText, setDraftText] = useState(text);

  const handleStart = () => {
    setText(draftText);
  };

  return (
    <div className="led-controls">

      {/* 텍스트 입력 */}
      <div className="ctrl-section">
        <label className="ctrl-label">텍스트 입력</label>
        <textarea
          className="ctrl-textarea"
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          placeholder="여기에 표시할 텍스트를 입력하세요..."
          rows={3}
          maxLength={200}
        />
        <div className="ctrl-textarea-footer">
          <span className="ctrl-charcount">{draftText.length} / 200</span>
          <button
            className="start-btn"
            onClick={handleStart}
            disabled={draftText === text}
          >
            시작
          </button>
        </div>
      </div>

      {/* 색상 선택 */}
      <div className="ctrl-section">
        <label className="ctrl-label">색상</label>
        <div className="ctrl-colors">
          {LED_COLORS.map(c => (
            <button
              key={c.id}
              className={`color-swatch ${colorId === c.id ? 'color-swatch--active' : ''}`}
              style={{ '--swatch': c.color, '--swatch-glow': c.glow }}
              onClick={() => setColorId(c.id)}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* 글자 크기 */}
      <div className="ctrl-section">
        <label className="ctrl-label">글자 크기</label>
        <div className="ctrl-chips">
          {FONT_SIZES.map(f => (
            <button
              key={f.id}
              className={`chip ${fontSizeId === f.id ? 'chip--active' : ''}`}
              onClick={() => setFontSizeId(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 폰트 */}
      <div className="ctrl-section">
        <label className="ctrl-label">폰트</label>
        <div className="ctrl-chips">
          {FONTS.map(f => (
            <button
              key={f.id}
              className={`chip ${fontId === f.id ? 'chip--active' : ''}`}
              style={{ fontFamily: f.family }}
              onClick={() => setFontId(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 스크롤 여부 + 속도 */}
      <div className="ctrl-section ctrl-section--row">
        <div className="ctrl-toggle-group">
          <label className="ctrl-label">스크롤</label>
          <button
            className={`toggle-btn ${isScrolling ? 'toggle-btn--on' : ''}`}
            onClick={() => setIsScrolling(v => !v)}
          >
            <span className="toggle-btn__knob" />
          </button>
        </div>

        {isScrolling && (
          <div className="ctrl-speed-group">
            <label className="ctrl-label">속도</label>
            <div className="ctrl-chips">
              {SPEEDS.map(s => (
                <button
                  key={s.id}
                  className={`chip ${speedId === s.id ? 'chip--active' : ''}`}
                  onClick={() => setSpeedId(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 전체화면 버튼 */}
      <button className="fullscreen-btn" onClick={onFullscreen}>
        <span>⛶</span> 전체화면으로 보기
      </button>
    </div>
  );
}
