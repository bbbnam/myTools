// src/components/blood-pressure/BpGoogleSync.jsx
import React, { useState } from 'react';
import './BpGoogleSync.css';

export default function BpGoogleSync({
  tokens, login, logout,
  spreadsheetId, setSpreadsheetId,
  onPull, onPushAll, recordCount,
  syncing, syncError, syncOk,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const isConnected = !!tokens;

  return (
    <div className="bp-sync">
      <div className="bp-sync__header">
        <span className="bp-sync__title">Google Sheets 연동</span>
        {isConnected
          ? <span className="bp-sync__badge bp-sync__badge--on">연결됨 ✓</span>
          : <span className="bp-sync__badge bp-sync__badge--off">미연결</span>
        }
      </div>

      {!isConnected ? (
        <div className="bp-sync__login-area">
          <p className="bp-sync__desc">
            Google 계정으로 로그인하면 혈압 기록이 내 Google Sheets에 자동 저장됩니다.
          </p>
          <button className="bp-sync__btn bp-sync__btn--google" onClick={login}>
            <GoogleIcon />
            Google 계정으로 연결
          </button>
        </div>
      ) : (
        <div className="bp-sync__connected-area">
          {/* Spreadsheet ID 입력 */}
          <label className="bp-sync__label">
            스프레드시트 ID
            <button className="bp-sync__help-btn" onClick={() => setShowHelp(v => !v)}>
              ?
            </button>
          </label>

          {showHelp && (
            <div className="bp-sync__help">
              <p>① <a href="https://sheets.google.com" target="_blank" rel="noreferrer">sheets.google.com</a> 에서 새 스프레드시트 생성</p>
              <p>② URL에서 ID 복사:</p>
              <code>docs.google.com/spreadsheets/d/<mark>여기가 ID</mark>/edit</code>
              <p>③ 아래 칸에 붙여넣기</p>
            </div>
          )}

          <input
            className="bp-sync__input"
            type="text"
            placeholder="예) 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            value={spreadsheetId}
            onChange={e => setSpreadsheetId(e.target.value.trim())}
          />

          {/* 액션 버튼 */}
          <div className="bp-sync__actions">
            <button
              className="bp-sync__btn bp-sync__btn--pull"
              onClick={onPull}
              disabled={syncing || !spreadsheetId}
            >
              {syncing ? '동기화 중...' : '☁ Sheets에서 불러오기'}
            </button>
            <button
                className="bp-sync__btn bp-sync__btn--push"
                onClick={onPushAll}
                disabled={syncing || !spreadsheetId || recordCount === 0}
              >
                ↑ 로컬 전체 업로드 ({recordCount}건)
            </button>
            <button className="bp-sync__btn bp-sync__btn--logout" onClick={logout}>
              연결 해제
            </button>
          </div>

          {syncOk    && <p className="bp-sync__ok">✓ 동기화 완료!</p>}
          {syncError && <p className="bp-sync__err">{syncError}</p>}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
