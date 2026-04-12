import React from 'react';
import LedDisplay from '../components/led-board/LedDisplay';
import LedControls from '../components/led-board/LedControls';
import LedFullscreen from '../components/led-board/LedFullscreen';
import { useLedBoard } from '../hooks/useLedBoard';
import './LedBoardPage.css';

export default function LedBoardPage() {
  const {
    text, setText,
    colorId, setColorId,
    speedId, setSpeedId,
    fontSizeId, setFontSizeId,
    fontId, setFontId,
    isScrolling, setIsScrolling,
    fullscreen, setFullscreen,
  } = useLedBoard();

  const displayProps = { text, colorId, speedId, fontSizeId, fontId, isScrolling };

  return (
    <div className="led-page">
      <header className="led-page__header">
        <h1 className="led-page__title">LED 전광판</h1>
        <p className="led-page__sub">텍스트 입력 후 시작 버튼을 누르세요</p>
      </header>

      {/* 미리보기 */}
      <section className="led-page__preview">
        <LedDisplay {...displayProps} />
      </section>

      {/* 컨트롤 */}
      <section className="led-page__controls">
        <LedControls
          {...displayProps}
          setText={setText}
          setColorId={setColorId}
          setSpeedId={setSpeedId}
          setFontSizeId={setFontSizeId}
          setFontId={setFontId}
          setIsScrolling={setIsScrolling}
          onFullscreen={() => setFullscreen(true)}
        />
      </section>

      {/* 전체화면 */}
      <LedFullscreen
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        {...displayProps}
      />
    </div>
  );
}
