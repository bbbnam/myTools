// src/pages/BloodPressurePage.jsx
import React, { useState } from 'react';
import { useBloodPressure } from '../hooks/useBloodPressure';
import BpInput      from '../components/blood-pressure/BpInput';
import BpChart      from '../components/blood-pressure/BpChart';
import BpStats      from '../components/blood-pressure/BpStats';
import BpHistory    from '../components/blood-pressure/BpHistory';
import BpGoogleSync from '../components/blood-pressure/BpGoogleSync';
import './BloodPressurePage.css';

const TABS = [
  { id: 'input',   label: '입력',   icon: '✏️' },
  { id: 'chart',   label: '그래프', icon: '📊' },
  { id: 'history', label: '기록',   icon: '📋' },
  { id: 'sync',    label: '연동',   icon: '☁️' },
];

export default function BloodPressurePage() {
  const [tab, setTab]     = useState('input');
  const [saving, setSaving] = useState(false);

  const {
    records, addRecord, pullFromSheets, pushAllToSheets, createSpreadsheet,
    tokens, login, logout,
    spreadsheetId, setSpreadsheetId,
    syncing, syncError, syncOk, hasUnsynced
  } = useBloodPressure();

  const handleSubmit = async (form) => {
    setSaving(true);
    try { await addRecord(form); setTab('chart'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bp-page">
      <header className="bp-page__header">
        <h1 className="bp-page__title">혈압 기록</h1>
        <p className="bp-page__sub">총 {records.length}건 기록됨</p>
      </header>

      {/* 탭 */}
      <div className="bp-page__tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`bp-page__tab ${tab === t.id ? 'bp-page__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="bp-page__tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="bp-page__content">
        {tab === 'input' && (
          <BpInput onSubmit={handleSubmit} loading={saving || syncing} />
        )}

        {tab === 'chart' && (
          <>
            <BpStats  records={records} />
            <BpChart  records={records} />
          </>
        )}

        {tab === 'history' && (
          <BpHistory records={records} />
        )}

        {tab === 'sync' && (
          <BpGoogleSync
            tokens={tokens} login={login} logout={logout}
            spreadsheetId={spreadsheetId} setSpreadsheetId={setSpreadsheetId}
            onPull={pullFromSheets}
            onPushAll={pushAllToSheets}
            onCreateSheet={createSpreadsheet}
            recordCount={records.length}
            syncing={syncing} syncError={syncError} syncOk={syncOk}
            hasUnsynced={hasUnsynced}
          />
        )}
      </div>
    </div>
  );
}
