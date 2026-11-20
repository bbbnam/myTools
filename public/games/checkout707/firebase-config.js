// 체크아웃 10분 전 — 랭킹용 Firebase 웹 설정
// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → SDK 설정의 firebaseConfig 값을 붙여 넣으세요.
// 이 값들은 공개돼도 되는 값입니다(보안은 Firestore 규칙이 담당). 비워 두면 랭킹 기능이 꺼진 채로 게임만 돌아갑니다.
window.FIREBASE_CONFIG = null;
// 예:
// window.FIREBASE_CONFIG = {
//   apiKey: '...',
//   authDomain: '...firebaseapp.com',
//   projectId: '...',
//   appId: '...',
// };
