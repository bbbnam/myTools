import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

const MIN_PX = 8;
const MAX_PX = 1200;
const ITERATIONS = 12;   // (1200-8)/2^12 ≈ 0.3px 정밀도
// 스크롤 모드에서 화면 폭에 최소한 이 정도 글자는 보이게 한다.
// (세로 화면에서 높이에만 맞추면 글자 하나가 화면보다 커져서 읽을 수 없다)
const MIN_VISIBLE_CHARS = 3;

/**
 * 컨테이너 안에 넘치지 않는 "최대 폰트 크기"를 이진 탐색으로 찾는다.
 *
 * @param containerRef 크기 기준이 되는 영역 (padding 만큼 여백으로 제외)
 * @param textRef      크기를 맞출 텍스트 엘리먼트 (컨테이너 폭을 채우는 블록이어야 함)
 * @param mode         'both'   폭·높이 모두 맞춤 (정지 모드)
 *                     'height' 높이만 맞춤 (스크롤 모드 — 가로로 흘러가므로 폭은 무의미)
 * @param signature    바뀌면 다시 측정할 값들을 이어붙인 문자열 (텍스트, 폰트, 방향 등)
 */
export function useAutoFitFontSize({ containerRef, textRef, mode = 'both', signature = '' }) {
  const [fontSize, setFontSize] = useState(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;

    const cs = window.getComputedStyle(container);
    const availW =
      container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH =
      container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return;

    const prev = el.style.fontSize;

    const fits = (px) => {
      // 스크롤 모드는 가로로 흘러가므로 높이에 맞추되, 폭 대비 너무 커지지 않게 막는다
      if (mode === 'height' && px > availW / MIN_VISIBLE_CHARS) return false;

      el.style.fontSize = `${px}px`;
      // scrollWidth/scrollHeight를 읽는 순간 레이아웃이 다시 계산된다
      const okH = el.scrollHeight <= availH + 1;
      const okW = mode === 'height' || el.scrollWidth <= availW + 1;
      return okH && okW;
    };

    // lo = 들어가는 크기, hi = 넘치는 크기
    let lo = MIN_PX;
    let hi = MAX_PX;
    for (let i = 0; i < ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }

    el.style.fontSize = prev;
    setFontSize(Math.max(MIN_PX, Math.floor(lo)));
  }, [containerRef, textRef, mode]);

  // 텍스트·폰트·방향이 바뀌면 화면에 그려지기 전에 다시 측정
  useLayoutEffect(() => {
    measure();
  }, [measure, signature]);

  // 컨테이너 크기 변화 (화면 회전, 창 크기, 주소창 노출/숨김)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, measure]);

  // iOS는 회전 직후 레이아웃이 아직 안 잡혀있는 경우가 있어 한 번 더 측정한다
  useEffect(() => {
    const onOrientation = () => {
      measure();
      setTimeout(measure, 300);
    };
    window.addEventListener('orientationchange', onOrientation);
    return () => window.removeEventListener('orientationchange', onOrientation);
  }, [measure]);

  // 웹폰트(Orbitron 등)가 늦게 로드되면 폴백 폰트 기준으로 측정돼 크기가 틀어진다
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return undefined;

    let cancelled = false;
    fonts.ready?.then(() => { if (!cancelled) measure(); }).catch(() => {});

    const onLoadingDone = () => measure();
    fonts.addEventListener?.('loadingdone', onLoadingDone);
    return () => {
      cancelled = true;
      fonts.removeEventListener?.('loadingdone', onLoadingDone);
    };
  }, [measure]);

  return fontSize;
}
