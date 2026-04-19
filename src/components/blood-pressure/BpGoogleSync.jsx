// src/components/blood-pressure/BpGoogleSync.jsx
import React from 'react';
import './BpGoogleSync.css';

export default function BpGoogleSync({
  tokens, login, logout,
  spreadsheetId, setSpreadsheetId,
  onPull, onPushAll, onCreateSheet, recordCount,
  syncing, syncError, syncOk,
  hasUnsynced,
}) {
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

          {!spreadsheetId ? (
            /* ── 시트 없음 → 자동 생성 안내 ── */
            <div className="bp-sync__create-area">
              <p className="bp-sync__desc">
                버튼을 누르면 Google Drive에 <b>"MyTools 혈압기록"</b> 스프레드시트가
                자동으로 생성됩니다.
              </p>
              <button
                className="bp-sync__btn bp-sync__btn--create"
                onClick={onCreateSheet}
                disabled={syncing}
              >
                {syncing ? '생성 중...' : '📄 스프레드시트 자동 생성'}
              </button>
              {/* ── 연결 해제 버튼 추가 ── */}
              <button
                className="bp-sync__btn bp-sync__btn--logout"
                onClick={logout}
              >
                연결 해제
              </button>
            </div>
          ) : (
            /* ── 시트 있음 → 동기화 버튼들 ── */
            <>
              <label className="bp-sync__label">연결된 스프레드시트</label>
              <div className="bp-sync__sheet-id">{spreadsheetId}</div>

              {/* 주의 안내 문구 */}
              <div className="bp-sync__warning">
                ⚠️ Google Drive에서 <b>"MyTools 혈압기록"</b> 파일명을 변경하면
                다른 기기에서 로그인 시 새 스프레드시트가 생성될 수 있습니다.
                또한 스프레드시트의 <b>첫 번째 시트 탭</b>에 데이터가 저장되므로
                탭 순서를 변경하지 마세요.
              </div>

              <div className="bp-sync__actions">
                <button
                  className="bp-sync__btn bp-sync__btn--pull"
                  onClick={onPull}
                  disabled={syncing}
                >
                  {syncing ? '동기화 중...' : '☁ Sheets에서 불러오기'}
                </button>
                <button
                  className="bp-sync__btn bp-sync__btn--push"
                  onClick={onPushAll}
                  disabled={syncing || !hasUnsynced}
                >
                  {hasUnsynced ? `↑ 로컬 전체 업로드 (${recordCount}건)` : '✓ 모두 동기화됨'}
                </button>
                <button
                  className="bp-sync__btn bp-sync__btn--logout"
                  onClick={logout}
                >
                  연결 해제
                </button>
              </div>
            </>
          )}

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
