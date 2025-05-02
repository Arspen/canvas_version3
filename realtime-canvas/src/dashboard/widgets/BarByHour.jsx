/* src/dashboard/widgets/BarByHour.jsx */
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import './barByHour.css';          // optional – use same card / pill styles

/* ---- colours reused from Donut -------------------- */
const USER_COLOURS = {
  P1: '#00C7BE',
  P2: '#34C759',
  P3: '#6CC7F5',
  P4: '#FF9500',
  P5: '#AF52DE',
  P6: '#FF2D55',
};
const ALL_COLOUR = '#02c8c4';   // teal-ish – pick any brand colour
/* helper to make an empty [0…23] array */
const emptySeries = () =>
  Array.from({ length: 24 }, (_ ,hr) => ({ hr, value: 0 }));

export default function BarByHour({ data = [] }) {
  /* ----- build list of unique days ---------------- */
  const days = useMemo(() => {
    const set = new Set();
    data.forEach(p => set.add(dayjs(p.timestamp).format('YYYY-MM-DD')));
    return Array.from(set).sort();         // ascending
  }, [data]);

  const [selDay, setSelDay]   = useState(days[days.length - 1] || '');
  const [filter,  setFilter]  = useState('All');    // which user pill

  /* ----- aggregate counts per hour ---------------- */
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

  /* ------------------------------------------------ */
  return (
    <div className="bar-card">
      {/* pills ------------------------------------------------ */}
      <div className="pill-row">
        {['All','P1','P2','P3','P4','P5','P6'].map(p => {
          const active = filter === (p === 'All' ? 'All' : p);
          return (
            <button
              key={p}
              className={`pill ${active ? 'active' : ''}`}
              style={p !== 'All' ? { border: `2px solid ${USER_COLOURS[p]}` } : {}}
              onClick={() => setFilter(p === 'All' ? 'All' : p)}
            >
              {p === 'All' ? 'All participants' : p}
            </button>
          );
        })}
        {/* day-picker ---------------------------------------- */}
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

      {/* chart ----------------------------------------------- */}
      <div className="bar-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={series} margin={{ top: 10, right: 16, left: 24, bottom: 32 }}>
            <XAxis
              dataKey="hr"
              tickFormatter={h => `${h}:00`}
              interval={0}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, (dataMax) => dataMax + 1]}
              tick={{ fontSize: 10 }}
            />
            <Tooltip formatter={v => [v, 'words']} />
                       <Bar
              dataKey="value"
              fill={filter === 'All' ? ALL_COLOUR : USER_COLOURS[filter]}
              radius={[4,4,0,0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* overlay if nothing to show ---------------------- */}
        {empty && (
          <div className="empty-overlay">
            no data for this day
          </div>
        )}
      </div>
    </div>
  );
}
