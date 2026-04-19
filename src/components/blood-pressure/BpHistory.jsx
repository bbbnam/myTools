// src/components/blood-pressure/BpHistory.jsx
import React, { useState } from 'react';
import { classifyBP, TIME_SLOTS, formatDate } from '../../utils/bpClassify';
import './BpHistory.css';

export default function BpHistory({ records }) {
  const [expanded, setExpanded] = useState(null);

  if (!records.length) {
    return <div className="bp-history bp-history--empty">아직 기록이 없습니다.</div>;
  }

  return (
    <div className="bp-history">
      <h3 className="bp-history__title">기록 목록</h3>
      <div className="bp-history__list">
        {records.map((r, i) => {
          const level  = classifyBP(r.systolic, r.diastolic);
          const slot   = TIME_SLOTS.find(s => s.id === r.timeSlot);
          const isOpen = expanded === i;
          return (
            <div key={i} className="bp-history__item" onClick={() => setExpanded(isOpen ? null : i)}>
              <div className="bp-history__row">
                <div className="bp-history__left">
                  <span className="bp-history__slot">{slot?.icon} {slot?.label}</span>
                  <span className="bp-history__date">{formatDate(r.date)} {r.time}</span>
                </div>
                <div className="bp-history__bp" style={{ color: level.color }}>
                  {r.systolic}/{r.diastolic}
                  <span className="bp-history__unit">mmHg</span>
                </div>
                <span className="bp-history__badge" style={{ background: level.color + '22', color: level.color }}>
                  {level.label}
                </span>
              </div>

              {isOpen && (
                <div className="bp-history__detail">
                  {r.pulse  && <span>맥박 {r.pulse}bpm</span>}
                  {r.weight && <span>몸무게 {r.weight}kg</span>}
                  {r.memo   && <span className="bp-history__memo">"{r.memo}"</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
