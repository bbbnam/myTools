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
  const [tab, setTab]       = useState('input');
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);

  const {
    records, addRecord, deleteRecord,
    selectedMonth, setSelectedMonth, allMonths,
    syncWithSheets,
    createSpreadsheet,
    tokens, login, logout,
    spreadsheetId,
    syncing, syncError, syncOk,
    hasUnsynced,
    sheetTabs, loadingTabs, loadSheetTabs,
    selectedTabs, setSelectedTabs,
    syncingTabs, syncSelectedTabs, tabSyncProgress,
  } = useBloodPressure();

  const handleSubmit = async (form) => {
    setSaving(true);
    setSaveNotice(null);
    try {
      const result = await addRecord(form);
      if (result?.sheetSave?.error) {
        setSaveNotice({
          type: 'warning',
          message: `로컬에는 저장됐지만 Google Sheets 즉시 저장은 실패했습니다. ${result.sheetSave.error}`,
        });
        return;
      }

      setSaveNotice(
        result?.sheetSave?.saved
          ? { type: 'success', message: '로컬과 Google Sheets에 저장됐습니다.' }
          : { type: 'success', message: '로컬에 저장됐습니다.' }
      );
      setTab('chart');
    }
    finally { setSaving(false); }
  };

  return (
    <div className="bp-page">
      <header className="bp-page__header">
        <h1 className="bp-page__title">혈압 기록</h1>
        <p className="bp-page__sub">총 {records.length}건 기록됨</p>
      </header>

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

      <div className="bp-page__content">
        {tab === 'input' && (
          <BpInput onSubmit={handleSubmit} loading={saving || syncing} notice={saveNotice} />
        )}
        {tab === 'chart' && (
          <>
            <BpStats records={records} />
            <BpChart records={records} />
          </>
        )}
        {tab === 'history' && (
          <BpHistory
            records={records}
            onDelete={deleteRecord}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            allMonths={allMonths}
          />
        )}
        {tab === 'sync' && (
          <BpGoogleSync
            tokens={tokens} login={login} logout={logout}
            spreadsheetId={spreadsheetId}
            onSync={syncWithSheets}
            onCreateSheet={createSpreadsheet}
            syncing={syncing} syncError={syncError} syncOk={syncOk}
            hasUnsynced={hasUnsynced}
            localCount={records.length}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            sheetTabs={sheetTabs}
            loadingTabs={loadingTabs}
            onLoadTabs={loadSheetTabs}
            selectedTabs={selectedTabs}
            setSelectedTabs={setSelectedTabs}
            syncingTabs={syncingTabs}
            onSyncSelectedTabs={syncSelectedTabs}
            tabSyncProgress={tabSyncProgress}
            allMonths={allMonths}
          />
        )}
      </div>
    </div>
  );
}
