import { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import './barByHour.css';          // re-use pill / card styles

/* ---------- colours (same as Donut pills) ---------------- */
const USER_COLOURS = {
  P1: '#00C7BE',
  P2: '#34C759',
  P3: '#6CC7F5',
  P4: '#FF9500',
  P5: '#AF52DE',
  P6: '#FF2D55',
};
const ALL_COLOUR = '#02c8c4';      // any “all users” colour

/* helper → empty array [{hr:0,value:0}, … 23] */
const emptySeries = () =>
  Array.from({ length: 24 }, (_, hr) => ({ hr, value: 0 }));

export default function BarByHour({ data = [] }) {
  /* 1 ───────── build sorted list of unique days ────────── */
  const days = useMemo(() => {
    const set = new Set();
    data.forEach(p =>
      set.add(dayjs(p.timestamp).format('YYYY-MM-DD')));
    return Array.from(set).sort();               // ascending
  }, [data]);

  /* 2 ───────── state: chosen day & user filter ─────────── */
  const [selDay, setSelDay] = useState('');      // ← blank at start
  const [filter, setFilter] = useState('All');

  /* whenever `days` changes, select the latest day */
  useEffect(() => {
    if (days.length) setSelDay(days[days.length - 1]);
  }, [days]);

  /* 3 ───────── aggregate counts per hour for that day ──── */
  const series = useMemo(() => {
    const arr = emptySeries();
    data.forEach(p => {
      if (filter !== 'All' && p.userId !== filter) return;
      if (dayjs(p.timestamp).format('YYYY-MM-DD') !== selDay) return;

      const h = dayjs(p.timestamp).hour();
      arr[h].value += 1;
    });
    return arr;
  }, [data, filter, selDay]);

  const empty = series.every(s => s.value === 0);

  /* 4 ───────── UI ──────────────────────────────────────── */
  return (
    <div className="bar-card">
      {/* pill filter row */}
      <div className="pill-row">
        {['All', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(p => {
          const active = filter === (p === 'All' ? 'All' : p);
          return (
            <button
              key={p}
              className={`pill ${active ? 'active' : ''}`}
              style={
                p !== 'All' ? { border: `2px solid ${USER_COLOURS[p]}` } : {}
              }
              onClick={() => setFilter(p === 'All' ? 'All' : p)}
            >
              {p === 'All' ? 'All participants' : p}
            </button>
          );
        })}

        {/* day dropdown */}
        <select
          value={selDay}
          onChange={e => setSelDay(e.target.value)}
          style={{ marginLeft: 12 }}
        >
          {days.map(d => (
            <option key={d} value={d}>
              {dayjs(d).format('DD MMM')}
            </option>
          ))}
        </select>
      </div>

      {/* chart */}
      <div className="bar-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={series}
            margin={{ top: 10, right: 16, left: 24, bottom: 32 }}
          >
            <XAxis
              dataKey="hr"
              tickFormatter={h => `${h}:00`}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, dataMax => dataMax + 1]}
              tick={{ fontSize: 10 }}
            />
            <Tooltip formatter={v => [v, 'words']} />
            <Bar
              dataKey="value"
              fill={filter === 'All' ? ALL_COLOUR : USER_COLOURS[filter]}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* overlay if nothing to show */}
        {empty && <div className="empty-overlay">no data for this day</div>}
      </div>
    </div>
  );
}
