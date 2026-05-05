// src/components/blood-pressure/BpInput.jsx
import React, { useState, useEffect } from 'react';
import { TIME_SLOTS, todayStr, nowTimeStr } from '../../utils/bpClassify';
import './BpInput.css';

const emptyForm = () => ({
  date:      todayStr(),
  time:      nowTimeStr(),
  timeSlot:  'morning',
  systolic:  '',
  diastolic: '',
  pulse:     '',
  weight:    '',
  memo:      '',
});

export default function BpInput({ onSubmit, loading, notice }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // 입력 탭에 올 때마다 날짜/시간을 오늘 기준으로 갱신
  useEffect(() => {
    setForm(f => ({
      ...f,
      date: todayStr(),
      time: nowTimeStr(),
    }));
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.systolic  || form.systolic  < 60 || form.systolic  > 250) e.systolic  = '60~250 사이 입력';
    if (!form.diastolic || form.diastolic < 40 || form.diastolic > 150) e.diastolic = '40~150 사이 입력';
    if (form.pulse  && (form.pulse  < 30  || form.pulse  > 250)) e.pulse  = '30~250 사이 입력';
    if (form.weight && (form.weight < 20  || form.weight > 300)) e.weight = '20~300 사이 입력';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(form);
    // 저장 후 폼 초기화 — 날짜/시간은 현재 시각으로
    setForm(emptyForm());
    setErrors({});
  };

  return (
    <div className="bp-input">
      <h3 className="bp-input__title">혈압 기록 입력</h3>

      {/* 날짜 + 시간 */}
      <div className="bp-input__row">
        <label className="bp-input__label">날짜
          <input className="bp-input__field" type="date" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </label>
        <label className="bp-input__label">시간
          <input className="bp-input__field" type="time" value={form.time}
            onChange={e => set('time', e.target.value)} />
        </label>
      </div>

      {/* 시간대 */}
      <div className="bp-input__slot-row">
        {TIME_SLOTS.map(s => (
          <button key={s.id}
            className={`slot-btn ${form.timeSlot === s.id ? 'slot-btn--active' : ''}`}
            onClick={() => set('timeSlot', s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* 혈압 수치 */}
      <div className="bp-input__row">
        <label className="bp-input__label">
          수축기 <span className="bp-input__unit">mmHg</span>
          <input className={`bp-input__field bp-input__field--num ${errors.systolic ? 'bp-input__field--err' : ''}`}
            type="number" placeholder="120" value={form.systolic}
            onChange={e => set('systolic', e.target.value)} inputMode="numeric" />
          {errors.systolic && <span className="bp-input__err">{errors.systolic}</span>}
        </label>
        <label className="bp-input__label">
          이완기 <span className="bp-input__unit">mmHg</span>
          <input className={`bp-input__field bp-input__field--num ${errors.diastolic ? 'bp-input__field--err' : ''}`}
            type="number" placeholder="80" value={form.diastolic}
            onChange={e => set('diastolic', e.target.value)} inputMode="numeric" />
          {errors.diastolic && <span className="bp-input__err">{errors.diastolic}</span>}
        </label>
      </div>

      {/* 맥박 + 몸무게 */}
      <div className="bp-input__row">
        <label className="bp-input__label">
          맥박 <span className="bp-input__unit">bpm</span>
          <input className={`bp-input__field bp-input__field--num ${errors.pulse ? 'bp-input__field--err' : ''}`}
            type="number" placeholder="72" value={form.pulse}
            onChange={e => set('pulse', e.target.value)} inputMode="numeric" />
          {errors.pulse && <span className="bp-input__err">{errors.pulse}</span>}
        </label>
        <label className="bp-input__label">
          몸무게 <span className="bp-input__unit">kg</span>
          <input className={`bp-input__field bp-input__field--num ${errors.weight ? 'bp-input__field--err' : ''}`}
            type="number" placeholder="70.0" step="0.1" value={form.weight}
            onChange={e => set('weight', e.target.value)} inputMode="decimal" />
          {errors.weight && <span className="bp-input__err">{errors.weight}</span>}
        </label>
      </div>

      {/* 메모 */}
      <label className="bp-input__label bp-input__label--full">메모
        <input className="bp-input__field" type="text"
          placeholder="약 복용, 운동 후, 카페인 섭취 등..."
          value={form.memo} onChange={e => set('memo', e.target.value)} maxLength={100} />
      </label>

      <button className="bp-input__submit" onClick={handleSubmit} disabled={loading}>
        {loading ? '저장 중...' : '기록 저장'}
      </button>

      {notice && (
        <p className={`bp-input__notice bp-input__notice--${notice.type}`}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
