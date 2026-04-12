import { useState } from 'react';

const STORAGE_KEY = 'led_board_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const defaults = {
  text:       '',
  colorId:    'red',
  speedId:    'normal',
  fontSizeId: 'md',
  isScrolling: true,
};

export function useLedBoard() {
  const saved = loadState();

  const [text,        setText]        = useState(saved?.text        ?? defaults.text);
  const [colorId,     setColorId]     = useState(saved?.colorId     ?? defaults.colorId);
  const [speedId,     setSpeedId]     = useState(saved?.speedId     ?? defaults.speedId);
  const [fontSizeId,  setFontSizeId]  = useState(saved?.fontSizeId  ?? defaults.fontSizeId);
  const [isScrolling, setIsScrolling] = useState(saved?.isScrolling ?? defaults.isScrolling);
  const [fullscreen,  setFullscreen]  = useState(false);

  // 상태 변경 시 localStorage에 저장
  const makeUpdater = (setter, key) => (value) => {
    setter(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveState({ text, colorId, speedId, fontSizeId, isScrolling, [key]: next });
      return next;
    });
  };

  return {
    text,        setText:        makeUpdater(setText, 'text'),
    colorId,     setColorId:     makeUpdater(setColorId, 'colorId'),
    speedId,     setSpeedId:     makeUpdater(setSpeedId, 'speedId'),
    fontSizeId,  setFontSizeId:  makeUpdater(setFontSizeId, 'fontSizeId'),
    isScrolling, setIsScrolling: makeUpdater(setIsScrolling, 'isScrolling'),
    fullscreen,  setFullscreen,
  };
}
