// src/components/blood-pressure/BpChart.jsx
import React, { useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { formatDate } from '../../utils/bpClassify';
import './BpChart.css';

const VIEWS = [
  { id: 'bp',     label: '혈압' },
  { id: 'weight', label: '몸무게' },
  { id: 'pulse',  label: '맥박' },
];

// 날짜별로 평균값 집계
function aggregateByDate(records) {
  const map = {};
  for (const r of records) {
    if (!map[r.date]) map[r.date] = { date: r.date, sys: [], dia: [], pulse: [], weight: [] };
    map[r.date].sys.push(r.systolic);
    map[r.date].dia.push(r.diastolic);
    if (r.pulse)  map[r.date].pulse.push(r.pulse);
    if (r.weight) map[r.date].weight.push(r.weight);
  }
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // 최근 30일
    .map(d => ({
      date:      formatDate(d.date),
      수축기:    Math.round(d.sys.reduce((a,b)=>a+b,0)/d.sys.length),
      이완기:    Math.round(d.dia.reduce((a,b)=>a+b,0)/d.dia.length),
      맥박:      d.pulse.length  ? Math.round(d.pulse.reduce((a,b)=>a+b,0)/d.pulse.length)  : null,
      몸무게:    d.weight.length ? +(d.weight.reduce((a,b)=>a+b,0)/d.weight.length).toFixed(1) : null,
    }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bp-chart__tooltip">
      <div className="bp-chart__tooltip-date">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="bp-chart__tooltip-row" style={{ color: p.color }}>
          {p.name}: <b>{p.value ?? '-'}</b>
        </div>
      ))}
    </div>
  );
};

export default function BpChart({ records }) {
  const [view, setView] = useState('bp');
  const data = aggregateByDate(records);

  if (data.length === 0) {
    return (
      <div className="bp-chart bp-chart--empty">
        <p>기록이 쌓이면 그래프가 표시됩니다 📊</p>
      </div>
    );
  }

  return (
    <div className="bp-chart">
      <div className="bp-chart__header">
        <span className="bp-chart__title">추이 그래프 <span className="bp-chart__sub">(일별 평균, 최근 30일)</span></span>
        <div className="bp-chart__tabs">
          {VIEWS.map(v => (
            <button key={v.id}
              className={`bp-chart__tab ${view === v.id ? 'bp-chart__tab--active' : ''}`}
              onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />

          {view === 'bp' && <>
            <ReferenceLine y={140} stroke="rgba(213,0,0,0.3)"  strokeDasharray="4 4" label={{ value:'고혈압', fill:'#d50000', fontSize:9 }} />
            <ReferenceLine y={120} stroke="rgba(255,214,0,0.3)" strokeDasharray="4 4" label={{ value:'주의',   fill:'#ffd600', fontSize:9 }} />
            <ReferenceLine y={80}  stroke="rgba(255,214,0,0.3)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="수축기" stroke="#ef5350" strokeWidth={2} dot={{ r:3, fill:'#ef5350' }} activeDot={{ r:5 }} />
            <Line type="monotone" dataKey="이완기" stroke="#42a5f5" strokeWidth={2} dot={{ r:3, fill:'#42a5f5' }} activeDot={{ r:5 }} />
          </>}

          {view === 'weight' && (
            <Bar dataKey="몸무게" fill="rgba(102,187,106,0.7)" radius={[4,4,0,0]} />
          )}

          {view === 'pulse' && (
            <Line type="monotone" dataKey="맥박" stroke="#ab47bc" strokeWidth={2} dot={{ r:3, fill:'#ab47bc' }} activeDot={{ r:5 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
