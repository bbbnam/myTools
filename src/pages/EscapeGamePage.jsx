import { useEffect } from 'react';

// 게임은 public/games/checkout707/ 의 독립 HTML 이라 그 페이지로 넘긴다
// (전체 화면 게임 + 구글 로그인 팝업이 iframe 안보다 안정적)
export default function EscapeGamePage() {
  useEffect(() => {
    window.location.assign('/games/checkout707/');
  }, []);
  return <p style={{ padding: 24, textAlign: 'center' }}>게임을 여는 중…</p>;
}
