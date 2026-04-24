// src/components/blood-pressure/BpGoogleSync.jsx
import React, { useState } from 'react';
import './BpGoogleSync.css';

export default function BpGoogleSync({
  tokens, login, logout,
  spreadsheetId,
  onSync, onUploadLocal, onCreateSheet,
  syncing, syncError, syncOk,
  hasUnsynced, localCount,
  selectedMonth, setSelectedMonth,  // ← setSelectedMonth 추가
  sheetTabs, loadingTabs, onLoadTabs,
  selectedTabs, setSelectedTabs,
  syncingTabs, onSyncSelectedTabs, tabSyncProgress,
  allMonths,
}) {
  const isConnected = !!tokens;
  const [confirmSync,   setConfirmSync]   = useState(false);
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [showTabSync,   setShowTabSync]   = useState(false);

  const formatMonth = (ym) => {
    const [y, m] = ym.split('-');
    return `${y}년 ${parseInt(m)}월`;
  };

  const toggleTab = (tab) => {
    setSelectedTabs(prev =>
      prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]
    );
  };

  const selectAll = () => setSelectedTabs([...sheetTabs]);
  const clearAll  = () => setSelectedTabs([]);

  // 최근 12개월 목록 생성
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

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
              <button className="bp-sync__btn bp-sync__btn--logout" onClick={logout}>
                연결 해제
              </button>
            </div>
          ) : (
            <>
              <label className="bp-sync__label">연결된 스프레드시트</label>
              <div className="bp-sync__sheet-id">{spreadsheetId}</div>

              {/* ── 동기화 대상 월 선택 드롭다운 ── */}
              <div className="bp-sync__month-selector">
                <label className="bp-sync__label">동기화 대상 월</label>
                <select
                  className="bp-sync__month-select"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  disabled={syncing || syncingTabs}
                >
                  {monthOptions.map(ym => (
                    <option key={ym} value={ym}>
                      {formatMonth(ym)}
                      {allMonths.includes(ym) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bp-sync__warning">
                ⚠️ Google Drive에서 <b>"MyTools 혈압기록"</b> 파일명을 변경하면
                다른 기기에서 로그인 시 새 스프레드시트가 생성될 수 있습니다.
                월별 탭 이름을 변경하지 마세요.
              </div>

              <div className="bp-sync__actions">
                <button
                  className="bp-sync__btn bp-sync__btn--pull"
                  onClick={() => setConfirmSync(true)}
                  disabled={syncing || syncingTabs}
                >
                  {syncing ? '동기화 중...' : `☁ ${formatMonth(selectedMonth)} 동기화`}
                </button>

                {hasUnsynced && (
                  <button
                    className="bp-sync__btn bp-sync__btn--push"
                    onClick={() => setConfirmUpload(true)}
                    disabled={syncing || syncingTabs}
                  >
                    ↑ 로컬 기록 업로드 ({localCount}건)
                  </button>
                )}
              </div>

              <div className="bp-sync__divider" />

              <button
                className="bp-sync__btn bp-sync__btn--tabs"
                onClick={() => {
                  setShowTabSync(v => !v);
                  if (!showTabSync && sheetTabs.length === 0) onLoadTabs();
                }}
                disabled={syncing || syncingTabs}
              >
                📂 과거 월 기록 가져오기
              </button>

              {showTabSync && (
                <div className="bp-sync__tab-area">
                  {loadingTabs ? (
                    <p className="bp-sync__tab-loading">탭 목록 불러오는 중...</p>
                  ) : sheetTabs.length === 0 ? (
                    <p className="bp-sync__tab-empty">
                      시트에 월별 탭이 없습니다.
                      <button className="bp-sync__tab-refresh" onClick={onLoadTabs}>
                        새로고침
                      </button>
                    </p>
                  ) : (
                    <>
                      <div className="bp-sync__tab-controls">
                        <button className="bp-sync__tab-ctrl-btn" onClick={selectAll}>전체 선택</button>
                        <button className="bp-sync__tab-ctrl-btn" onClick={clearAll}>전체 해제</button>
                        <button className="bp-sync__tab-ctrl-btn" onClick={onLoadTabs}>새로고침</button>
                      </div>

                      <div className="bp-sync__tab-list">
                        {sheetTabs.map(tab => (
                          <label key={tab} className="bp-sync__tab-item">
                            <input
                              type="checkbox"
                              checked={selectedTabs.includes(tab)}
                              onChange={() => toggleTab(tab)}
                              disabled={syncingTabs}
                            />
                            <span>{formatMonth(tab)}</span>
                            {allMonths.includes(tab) && (
                              <span className="bp-sync__tab-local">로컬 있음</span>
                            )}
                          </label>
                        ))}
                      </div>

                      {tabSyncProgress && (
                        <p className="bp-sync__tab-progress">{tabSyncProgress}</p>
                      )}

                      <button
                        className="bp-sync__btn bp-sync__btn--pull"
                        onClick={onSyncSelectedTabs}
                        disabled={syncingTabs || selectedTabs.length === 0}
                      >
                        {syncingTabs
                          ? tabSyncProgress || '동기화 중...'
                          : `선택한 ${selectedTabs.length}개월 동기화`}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="bp-sync__divider" />

              <button className="bp-sync__btn bp-sync__btn--logout" onClick={logout}>
                연결 해제
              </button>
            </>
          )}

          {syncOk    && <p className="bp-sync__ok">✓ 완료!</p>}
          {syncError && <p className="bp-sync__err">{syncError}</p>}
        </div>
      )}

      {confirmSync && (
        <div className="bp-sync__overlay">
          <div className="bp-sync__dialog">
            <p className="bp-sync__dialog-title">⚠️ 동기화 확인</p>
            <p className="bp-sync__dialog-desc">
              <b>{formatMonth(selectedMonth)}</b> 시트 데이터로 동기화하면
              현재 기기의 <b>해당 월 로컬 기록이 모두 교체</b>됩니다.
            </p>
            <p className="bp-sync__dialog-desc">
              로컬에만 있는 기록이 있다면 먼저 업로드를 해주세요.
            </p>
            <div className="bp-sync__dialog-btns">
              <button
                className="bp-sync__dialog-btn bp-sync__dialog-btn--cancel"
                onClick={() => setConfirmSync(false)}
              >취소</button>
              <button
                className="bp-sync__dialog-btn bp-sync__dialog-btn--confirm"
                onClick={() => { setConfirmSync(false); onSync(); }}
              >동기화 진행</button>
            </div>
          </div>
        </div>
      )}

      {confirmUpload && (
        <div className="bp-sync__overlay">
          <div className="bp-sync__dialog">
            <p className="bp-sync__dialog-title">업로드 확인</p>
            <p className="bp-sync__dialog-desc">
              <b>{formatMonth(selectedMonth)}</b> 로컬 기록 <b>{localCount}건</b>을
              Google Sheets에 업로드합니다.
            </p>
            <div className="bp-sync__dialog-btns">
              <button
                className="bp-sync__dialog-btn bp-sync__dialog-btn--cancel"
                onClick={() => setConfirmUpload(false)}
              >취소</button>
              <button
                className="bp-sync__dialog-btn bp-sync__dialog-btn--confirm"
                onClick={() => { setConfirmUpload(false); onUploadLocal(); }}
              >업로드</button>
            </div>
          </div>
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