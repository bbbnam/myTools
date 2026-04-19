// src/components/blood-pressure/BpStats.jsx
import React from 'react';
import { classifyBP } from '../../utils/bpClassify';
import './BpStats.css';

function avg(arr) { return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null; }
function max(arr) { return arr.length ? Math.max(...arr) : null; }
function min(arr) { return arr.length ? Math.min(...arr) : null; }

export default function BpStats({ records }) {
  if (!records.length) return null;

  const sys = records.map(r => r.systolic);
  const dia = records.map(r => r.diastolic);
  const weights = records.filter(r => r.weight).map(r => r.weight);

  const avgLevel = classifyBP(avg(sys), avg(dia));

  const stats = [
    { label: '평균 수축기', value: avg(sys),  unit: 'mmHg', color: '#ef5350' },
    { label: '평균 이완기', value: avg(dia),  unit: 'mmHg', color: '#42a5f5' },
    { label: '최고 수축기', value: max(sys),  unit: 'mmHg', color: '#ff7043' },
    { label: '최저 수축기', value: min(sys),  unit: 'mmHg', color: '#66bb6a' },
    { label: '평균 몸무게', value: weights.length ? (weights.reduce((a,b)=>a+b,0)/weights.length).toFixed(1) : null, unit: 'kg', color: '#ab47bc' },
    { label: '기록 횟수',  value: records.length, unit: '회',  color: '#888' },
  ];

  return (
    <div className="bp-stats">
      <div className="bp-stats__level" style={{ '--level-color': avgLevel.color, '--level-glow': avgLevel.glow }}>
        <span className="bp-stats__level-label">평균 혈압 상태</span>
        <span className="bp-stats__level-name">{avgLevel.label}</span>
        <span className="bp-stats__level-value">{avg(sys)} / {avg(dia)}</span>
      </div>
      <div className="bp-stats__grid">
        {stats.map(s => s.value !== null && (
          <div key={s.label} className="bp-stats__card">
            <span className="bp-stats__card-val" style={{ color: s.color }}>{s.value}</span>
            <span className="bp-stats__card-unit">{s.unit}</span>
            <span className="bp-stats__card-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
