# My Tools App

LED 전광판을 시작으로, 다양한 도구를 추가할 수 있는 확장형 모바일 앱입니다.

## 현재 기능
- 📺 **LED 전광판** — 텍스트를 LED 전광판처럼 표시 (색상, 크기, 스크롤 속도 조절)

## 프로젝트 구조

```
src/
├── routes.js                  # ✅ 메뉴 등록 파일 (새 기능 추가 시 여기만 수정)
├── App.js                     # 라우터 설정
├── styles/
│   └── global.css             # 전역 디자인 토큰 (CSS 변수)
├── pages/
│   ├── HomePage.jsx           # 메뉴 허브 홈
│   └── LedBoardPage.jsx       # LED 전광판 페이지
├── components/
│   ├── common/
│   │   └── BottomNav.jsx      # 하단 네비게이션 (자동으로 메뉴 반영)
│   └── led-board/
│       ├── LedDisplay.jsx     # LED 화면 컴포넌트
│       ├── LedControls.jsx    # 설정 컨트롤 패널
│       └── LedFullscreen.jsx  # 전체화면 모달
└── hooks/
    └── useLedBoard.js         # LED 상태 관리 + localStorage 저장
```

## 새 기능 추가하는 방법

1. `src/pages/`에 새 페이지 컴포넌트 생성 (예: `BloodPressurePage.jsx`)
2. `src/routes.js`에 항목 추가:

```js
{
  id: 'blood-pressure',
  path: '/bp',
  label: '혈압 기록',
  icon: '❤️',
  description: '혈압을 날짜별로 기록하고 관리',
  component: BloodPressurePage,
  enabled: true,
}
```

그러면 홈 메뉴와 하단 네비게이션에 자동으로 반영됩니다.

## 로컬 실행

```bash
npm install
npm start
```

## GitHub + Vercel 배포

```bash
# 1. GitHub 저장소 생성 후
git init
git add .
git commit -m "init: LED board app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# 2. vercel.com 접속 → "Add New Project" → GitHub 저장소 연결
# 3. Framework: Create React App 자동 감지됨
# 4. Deploy 클릭 → 완료!
```

`vercel.json`이 포함되어 있어 React Router의 클라이언트 사이드 라우팅이 올바르게 동작합니다.
