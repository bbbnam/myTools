import React, { useMemo, useState } from 'react';
import {
  MEMO_TEMPLATES, STICKERS, TOOLS, useTemplateMemos,
} from '../hooks/useTemplateMemos';
import './TemplateMemoPage.css';

const templateMap = Object.fromEntries(MEMO_TEMPLATES.map(t => [t.id, t]));

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthDays(baseDate) {
  const [year, month] = baseDate.slice(0, 7).split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
}

function tagsText(tags) {
  return (tags || []).join(', ');
}

function MemoEditor({ editingMemo, onCancel, onSave, buildDefaultContent, readBpRecordsForDate }) {
  const isEdit = !!editingMemo;
  const [templateType, setTemplateType] = useState(editingMemo?.templateType || 'basic');
  const [date, setDate] = useState(editingMemo?.date || todayStr());
  const [title, setTitle] = useState(editingMemo?.title || '');
  const [tagInput, setTagInput] = useState(tagsText(editingMemo?.tags));
  const [content, setContent] = useState(
    editingMemo?.content || buildDefaultContent(templateType, date)
  );

  const linkedBpRecords = content.linkedBloodPressureRecords || [];
  const template = templateMap[templateType] || templateMap.basic;

  const setContentValue = (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const changeTemplate = (nextType) => {
    setTemplateType(nextType);
    setContent(prev => ({ ...buildDefaultContent(nextType, date), body: prev.body || '' }));
  };

  const changeDate = (nextDate) => {
    setDate(nextDate);
    if (templateType === 'blood-pressure') {
      setContent(prev => ({
        ...prev,
        linkedBloodPressureDate: nextDate,
        linkedBloodPressureRecords: readBpRecordsForDate(nextDate),
      }));
    }
  };

  const toggleListValue = (key, value) => {
    setContent(prev => {
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter(item => item !== value) : [...list, value],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({
      id: editingMemo?.id,
      title,
      date,
      templateType,
      tagsText: tagInput,
      content,
    });
    if (!isEdit) {
      setTitle('');
      setTagInput('');
      setContent(buildDefaultContent(templateType, date));
    }
  };

  return (
    <form className="memo-editor" onSubmit={handleSubmit}>
      <div className="memo-editor__topline">
        <div>
          <span className="memo-editor__eyebrow">{isEdit ? '메모 수정' : '새 메모 작성'}</span>
          <h2>{template.icon} {template.label}</h2>
        </div>
        {isEdit && <button type="button" className="memo-btn memo-btn--ghost" onClick={onCancel}>취소</button>}
      </div>

      <div className="memo-template-grid">
        {MEMO_TEMPLATES.map(item => (
          <button
            type="button"
            key={item.id}
            className={`memo-template ${templateType === item.id ? 'memo-template--active' : ''}`}
            onClick={() => changeTemplate(item.id)}
          >
            <span>{item.icon}</span>
            <b>{item.label}</b>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className="memo-form-grid">
        <label className="memo-field memo-field--wide">제목
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="오늘의 기록 제목" />
        </label>
        <label className="memo-field">날짜
          <input type="date" value={date} onChange={e => changeDate(e.target.value)} />
        </label>
        <label className="memo-field">태그
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="건강, 일기, 관찰" />
        </label>
      </div>

      {templateType === 'diary' && (
        <div className="memo-form-grid">
          <label className="memo-field">오늘 기분
            <input value={content.mood || ''} onChange={e => setContentValue('mood', e.target.value)} placeholder="좋음 / 피곤함 / 설렘" />
          </label>
          <label className="memo-field memo-field--wide">오늘 한 일
            <input value={content.todayDone || ''} onChange={e => setContentValue('todayDone', e.target.value)} placeholder="오늘 있었던 일 요약" />
          </label>
        </div>
      )}

      {templateType === 'blood-pressure' && (
        <section className="memo-linked-card">
          <div className="memo-linked-card__header">
            <b>연결된 혈압 기록</b>
            <span>{linkedBpRecords.length}건</span>
          </div>
          {linkedBpRecords.length ? linkedBpRecords.map(record => (
            <div key={record.id || `${record.date}-${record.time}`} className="bp-linked-row">
              <span>{record.time || '시간 없음'}</span>
              <b>{record.systolic} / {record.diastolic}</b>
              <small>맥박 {record.pulse || '-'} · {record.memo || '메모 없음'}</small>
            </div>
          )) : (
            <p className="memo-empty-note">선택한 날짜의 혈압 기록이 없습니다. 그래도 혈압 일기 메모는 작성할 수 있어요.</p>
          )}
          <label className="memo-field">컨디션/복약 메모
            <input value={content.condition || ''} onChange={e => setContentValue('condition', e.target.value)} placeholder="컨디션, 복약 여부 등" />
          </label>
        </section>
      )}

      {(templateType === 'plant' || templateType === 'animal') && (
        <div className="memo-form-grid">
          <label className="memo-field">관찰 대상
            <input value={content.observationTarget || ''} onChange={e => setContentValue('observationTarget', e.target.value)} placeholder="식물/동물 이름" />
          </label>
          <label className="memo-field">위치
            <input value={content.location || ''} onChange={e => setContentValue('location', e.target.value)} placeholder="집, 공원, 베란다" />
          </label>
        </div>
      )}

      <label className="memo-field memo-field--wide">본문
        <textarea
          value={content.body || ''}
          onChange={e => setContentValue('body', e.target.value)}
          placeholder="기록하고 싶은 내용을 적어주세요"
          rows={6}
        />
      </label>

      <section className="memo-decor-panel">
        <div>
          <b>스티커</b>
          <div className="memo-chip-row">
            {STICKERS.map(sticker => (
              <button
                type="button"
                key={sticker}
                className={`memo-chip ${content.stickers?.includes(sticker) ? 'memo-chip--active' : ''}`}
                onClick={() => toggleListValue('stickers', sticker)}
              >{sticker}</button>
            ))}
          </div>
        </div>
        <div>
          <b>간단 도구</b>
          <div className="memo-chip-row">
            {TOOLS.map(tool => (
              <button
                type="button"
                key={tool}
                className={`memo-chip ${content.tools?.includes(tool) ? 'memo-chip--active' : ''}`}
                onClick={() => toggleListValue('tools', tool)}
              >{tool}</button>
            ))}
          </div>
        </div>
      </section>

      <button className="memo-btn memo-btn--primary" type="submit">{isEdit ? '수정 저장' : '메모 저장'}</button>
    </form>
  );
}

function MemoCard({ memo, onEdit, onDelete }) {
  const template = templateMap[memo.templateType] || templateMap.basic;
  const content = memo.content || {};
  const preview = [content.mood, content.todayDone, content.condition, content.body]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 140);

  return (
    <article className="memo-card">
      <div className="memo-card__head">
        <span className="memo-card__template">{template.icon} {template.label}</span>
        <time>{memo.date}</time>
      </div>
      <h3>{memo.title}</h3>
      {preview && <p>{preview}</p>}
      {!!content.linkedBloodPressureRecords?.length && (
        <div className="memo-card__bp">혈압 기록 {content.linkedBloodPressureRecords.length}건 연결됨</div>
      )}
      <div className="memo-card__tags">
        {(memo.tags || []).map(tag => <span key={tag}>#{tag}</span>)}
      </div>
      <div className="memo-card__actions">
        <button onClick={() => onEdit(memo)}>수정</button>
        <button onClick={() => onDelete(memo.id)}>삭제</button>
      </div>
    </article>
  );
}

export default function TemplateMemoPage() {
  const memo = useTemplateMemos();
  const [tab, setTab] = useState('write');
  const [editingMemo, setEditingMemo] = useState(null);

  const days = useMemo(() => monthDays(memo.selectedDate), [memo.selectedDate]);

  const startEdit = (item) => {
    setEditingMemo(item);
    setTab('write');
  };

  const saveMemo = async (payload) => {
    await memo.upsertMemo(payload);
    setEditingMemo(null);
    setTab('list');
  };

  return (
    <div className="memo-page">
      <header className="memo-page__header">
        <div>
          <h1>템플릿 메모</h1>
          <p>템플릿을 골라 쓰고, 태그/검색/달력으로 다시 찾는 개인 기록장</p>
        </div>
        <span className="memo-page__count">{memo.memos.length}개</span>
      </header>

      <div className="memo-tabs">
        {[
          ['write', '✏️', '작성'],
          ['list', '📋', '목록'],
          ['calendar', '📅', '달력'],
          ['sync', '☁️', '연동'],
        ].map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'memo-tabs__btn memo-tabs__btn--active' : 'memo-tabs__btn'} onClick={() => setTab(id)}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>

      {memo.notice && (
        <div className={`memo-notice memo-notice--${memo.notice.type}`} onClick={() => memo.setNotice(null)}>
          {memo.notice.message}
        </div>
      )}

      {tab === 'write' && (
        <MemoEditor
          editingMemo={editingMemo}
          onCancel={() => setEditingMemo(null)}
          onSave={saveMemo}
          buildDefaultContent={memo.buildDefaultContent}
          readBpRecordsForDate={memo.readBpRecordsForDate}
        />
      )}

      {tab === 'list' && (
        <section className="memo-section">
          <div className="memo-filter-bar">
            <input value={memo.query} onChange={e => memo.setQuery(e.target.value)} placeholder="제목, 내용, 태그 검색" />
            <select value={memo.templateFilter} onChange={e => memo.setTemplateFilter(e.target.value)}>
              <option value="all">전체 템플릿</option>
              {MEMO_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="memo-list">
            {memo.filteredMemos.length ? memo.filteredMemos.map(item => (
              <MemoCard key={item.id} memo={item} onEdit={startEdit} onDelete={memo.deleteMemo} />
            )) : <p className="memo-empty-note">조회되는 메모가 없습니다.</p>}
          </div>
        </section>
      )}

      {tab === 'calendar' && (
        <section className="memo-section">
          <div className="memo-calendar-head">
            <label>기준 날짜
              <input type="date" value={memo.selectedDate} onChange={e => memo.setSelectedDate(e.target.value)} />
            </label>
            <b>{memo.selectedDate.slice(0, 7)}</b>
          </div>
          <div className="memo-calendar">
            {days.map(day => (
              <button
                key={day}
                className={`memo-calendar__day ${memo.selectedDate === day ? 'memo-calendar__day--active' : ''}`}
                onClick={() => memo.setSelectedDate(day)}
              >
                <span>{Number(day.slice(-2))}</span>
                {!!memo.memoCountByDate[day] && <b>{memo.memoCountByDate[day]}</b>}
              </button>
            ))}
          </div>
          <h3 className="memo-subtitle">{memo.selectedDate} 메모</h3>
          <div className="memo-list">
            {memo.selectedDateMemos.length ? memo.selectedDateMemos.map(item => (
              <MemoCard key={item.id} memo={item} onEdit={startEdit} onDelete={memo.deleteMemo} />
            )) : <p className="memo-empty-note">선택한 날짜의 메모가 없습니다.</p>}
          </div>
        </section>
      )}

      {tab === 'sync' && (
        <section className="memo-sync memo-section">
          <div className="memo-sync__status">
            <b>Google Sheets 연동</b>
            <span className={memo.tokens ? 'memo-sync__badge memo-sync__badge--on' : 'memo-sync__badge'}>
              {memo.tokens ? '연결됨' : '미연결'}
            </span>
          </div>
          <p>앱 사용 전 Google 연동을 필수로 하는 기획을 반영해, 이 탭에서 계정 연결과 메모 시트 생성을 진행합니다.</p>
          {memo.spreadsheetId && <code>{memo.spreadsheetId}</code>}
          {!memo.tokens ? (
            <button className="memo-btn memo-btn--primary" onClick={memo.login}>Google 계정으로 연결</button>
          ) : (
            <div className="memo-sync__actions">
              <button className="memo-btn memo-btn--primary" onClick={memo.ensureSpreadsheet} disabled={memo.syncing}>
                {memo.spreadsheetId ? '메모 시트 확인' : '메모 시트 생성'}
              </button>
              <button className="memo-btn" onClick={memo.uploadToSheets} disabled={memo.syncing}>로컬 → Sheets 업로드</button>
              <button className="memo-btn" onClick={memo.downloadFromSheets} disabled={memo.syncing}>Sheets → 로컬 불러오기</button>
              <button className="memo-btn memo-btn--ghost" onClick={memo.logout}>연결 해제</button>
            </div>
          )}
          {memo.syncing && <p className="memo-empty-note">동기화 중...</p>}
        </section>
      )}
    </div>
  );
}
