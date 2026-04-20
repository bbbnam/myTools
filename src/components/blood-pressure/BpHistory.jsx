// src/components/blood-pressure/BpHistory.jsx
import React, { useState, useCallback } from 'react';
import { classifyBP, TIME_SLOTS, formatDate } from '../../utils/bpClassify';
import './BpHistory.css';

export default function BpHistory({ records, onDelete }) {
  const [expanded, setExpanded] = useState(null);
  const [longPressIdx, setLongPressIdx] = useState(null);
  const [pressTimer, setPressTimer] = useState(null);

  const handlePressStart = useCallback((i) => {
    const timer = setTimeout(() => {
      setLongPressIdx(i);
      setExpanded(null);
    }, 600); // 600ms 꾹 누르면 삭제 모드
    setPressTimer(timer);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  const handleTap = useCallback((i) => {
    if (longPressIdx === i) return; // 꾹 눌렀을 땐 탭 무시
    setExpanded(prev => prev === i ? null : i);
  }, [longPressIdx]);

  const handleDelete = useCallback((i) => {
    onDelete(i);
    setLongPressIdx(null);
  }, [onDelete]);

  if (!records.length) {
    return <div className="bp-history bp-history--empty">아직 기록이 없습니다.</div>;
  }

  return (
    <div className="bp-history">
      <h3 className="bp-history__title">기록 목록</h3>
      {longPressIdx !== null && (
        <p className="bp-history__hint">삭제할 기록을 확인하세요</p>
      )}
      <div className="bp-history__list">
        {records.map((r, i) => {
          const level   = classifyBP(r.systolic, r.diastolic);
          const slot    = TIME_SLOTS.find(s => s.id === r.timeSlot);
          const isOpen  = expanded === i;
          const isLong  = longPressIdx === i;

          return (
            <div
              key={i}
              className={`bp-history__item ${isLong ? 'bp-history__item--delete' : ''}`}
              onMouseDown={() => handlePressStart(i)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(i)}
              onTouchEnd={handlePressEnd}
              onClick={() => handleTap(i)}
            >
              <div className="bp-history__row">
                <div className="bp-history__left">
                  <span className="bp-history__slot">{slot?.icon} {slot?.label}</span>
                  <span className="bp-history__date">{formatDate(r.date)} {r.time}</span>
                </div>
                <div className="bp-history__bp" style={{ color: level.color }}>
                  {r.systolic}/{r.diastolic}
                  <span className="bp-history__unit">mmHg</span>
                </div>
                {isLong ? (
                  <button
                    className="bp-history__delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
                  >
                    삭제
                  </button>
                ) : (
                  <span
                    className="bp-history__badge"
                    style={{ background: level.color + '22', color: level.color }}
                  >
                    {level.label}
                  </span>
                )}
              </div>

              {isOpen && !isLong && (
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

      {/* 삭제 모드 취소 */}
      {longPressIdx !== null && (
        <button
          className="bp-history__cancel-btn"
          onClick={() => setLongPressIdx(null)}
        >
          취소
        </button>
      )}
    </div>
  );
}