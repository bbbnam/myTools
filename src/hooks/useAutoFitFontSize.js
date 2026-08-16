import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN_PX = 8;
const MAX_PX = 1200;
const ITERATIONS = 12;   // (1200-8)/2^12 ≈ 0.3px 정밀도
// 스크롤 모드에서 화면 폭에 최소한 이 정도 글자는 보이게 한다.
// (세로 화면에서 높이에만 맞추면 글자 하나가 화면보다 커져서 읽을 수 없다)
const MIN_VISIBLE_CHARS = 3;
// 단어를 지키는 크기가 쪼개는 크기의 이 비율 미만이면 포기하고 쪼갠다.
// (띄어쓰기 없는 긴 단어 하나 때문에 전체가 깨알같이 작아지는 것을 막는다)
const MIN_WORD_FIT_RATIO = 0.6;
// 맞춘 크기가 이미 이 비율보다 적게 높이를 쓰면 여백이 충분한 것으로 보고
// 세로 축소를 건너뛴다. (긴 단어 때문에 폭에서 막힌 경우 더 줄이면 괜히 작아진다)
const LOOSE_ENOUGH = 0.85;

/**
 * 컨테이너 안에 넘치지 않는 "최대 폰트 크기"를 이진 탐색으로 찾는다.
 *
 * 방향 판정과 줄바꿈 규칙 적용까지 측정 함수 안에서 함께 처리한다.
 * React 상태가 바뀌길 기다렸다 측정하면 회전 도중 순서가 어긋나 엉뚱한 크기가 남는다.
 *
 * @param containerRef  크기 기준이 되는 영역 (padding 만큼 여백으로 제외)
 * @param textRef       크기를 맞출 텍스트 엘리먼트 (컨테이너 폭을 채우는 블록이어야 함)
 * @param isScrolling   스크롤 모드 여부 (가로로 흘러가므로 높이만 맞춘다)
 * @param portraitScale 세로 화면에서 맞춘 크기에 곱할 비율 (여백 확보)
 * @param wrapClass     세로 화면에서 텍스트 엘리먼트에 붙일 줄바꿈 클래스명
 * @param signature     바뀌면 다시 측정할 값들을 이어붙인 문자열 (텍스트, 폰트 등)
 * @returns {{ fontSize: number|null, isLandscape: boolean }}
 */
export function useAutoFitFontSize({
  containerRef,
  textRef,
  isScrolling = false,
  portraitScale = 1,
  wrapClass = '',
  signature = '',
}) {
  const [fontSize, setFontSize]     = useState(null);
  const [isLandscape, setLandscape] = useState(false);

  // 측정 함수는 항상 최신 설정을 봐야 한다. 값을 클로저로 잡아두면
  // 회전 직후에 예약된 재측정이 회전 전 설정으로 되돌려 놓는다.
  const optsRef = useRef();
  optsRef.current = { isScrolling, portraitScale, wrapClass };

  const measure = useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;

    const { isScrolling: scrolling, portraitScale: scale, wrapClass: cls } = optsRef.current;

    const cs = window.getComputedStyle(container);
    const availW =
      container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH =
      container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return;

    // 방향은 컨테이너 실제 크기로 판정하고, 줄바꿈 규칙도 측정 직전에 맞춘다
    const landscape = container.clientWidth > container.clientHeight;
    const wrap = !scrolling && !landscape;
    if (cls) el.classList.toggle(cls, wrap);

    const prevFontSize = el.style.fontSize;
    const prevWrap     = el.style.overflowWrap;

    const fits = (px) => {
      // 스크롤 모드는 가로로 흘러가므로 높이에 맞추되, 폭 대비 너무 커지지 않게 막는다
      if (scrolling && px > availW / MIN_VISIBLE_CHARS) return false;

      el.style.fontSize = `${px}px`;
      // scrollWidth/scrollHeight를 읽는 순간 레이아웃이 다시 계산된다
      const okH = el.scrollHeight <= availH + 1;
      const okW = scrolling || el.scrollWidth <= availW + 1;
      return okH && okW;
    };

    const search = () => {
      // lo = 들어가는 크기, hi = 넘치는 크기
      let lo = MIN_PX;
      let hi = MAX_PX;
      for (let i = 0; i < ITERATIONS; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      return lo;
    };

    let best;
    if (wrap) {
      // 단어를 쪼갤 수 있으면 텍스트가 폭을 넘는 일이 없어 폭 검사가 항상 통과한다.
      // 그래서 높이만 보고 크기가 정해지고, 단어가 폭보다 커져도 막지 못한다.
      // "단어를 쪼개지 않는 크기"를 따로 구해서 그쪽을 우선 쓴다.
      el.style.overflowWrap = 'anywhere';
      const splitFit = search();
      el.style.overflowWrap = 'normal';
      const wordFit = search();
      best = wordFit >= splitFit * MIN_WORD_FIT_RATIO ? wordFit : splitFit;
    } else {
      best = search();
    }

    // 세로 여백 축소는 글자가 실제로 화면을 꽉 채울 때만 의미가 있다
    let applied = 1;
    if (wrap && scale < 1) {
      el.style.fontSize = `${best}px`;
      if (el.scrollHeight > availH * LOOSE_ENOUGH) applied = scale;
    }

    el.style.fontSize     = prevFontSize;
    el.style.overflowWrap = prevWrap;

    setLandscape(landscape);
    setFontSize(Math.max(MIN_PX, Math.floor(best * applied)));
  }, [containerRef, textRef]);

  // 텍스트·폰트가 바뀌면 화면에 그려지기 전에 다시 측정
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

  // 회전 직후에는 레이아웃이 아직 안 잡혀있는 경우가 있어 한 번 더 측정한다
  useEffect(() => {
    const timers = [];
    const onOrientation = () => {
      measure();
      timers.push(setTimeout(measure, 300));
    };
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('orientationchange', onOrientation);
      timers.forEach(clearTimeout);
    };
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

  return { fontSize, isLandscape };
}
