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
import './barByHour.css'; // re-use pill / card styles

/* ---------- colours (same as Donut pills) ---------------- */
const USER_COLOURS = {
  P1: '#00C7BE',
  P2: '#34C759',
  P3: '#6CC7F5',
  P4: '#FF9500',
  P5: '#AF52DE',
  P6: '#FF2D55',
};
const ALL_COLOUR = '#02c8c4'; // any “all users” colour

/* helper → empty array [{hr:0,value:0}, … 23] */
const emptySeries = () =>
  Array.from({ length: 24 }, (_, hr) => ({ hr, value: 0 }));

export default function BarByHour({ data = [] }) {
  /* 1 ───────── build sorted list of unique days ────────── */
  const days = useMemo(() => {
    const set = new Set();
    if (Array.isArray(data)) { // Ensure data is an array before processing
      data.forEach(p => {
        if (p && p.timestamp) { // Check if p and p.timestamp exist
          set.add(dayjs(p.timestamp).format('YYYY-MM-DD'));
        }
      });
    }
    return Array.from(set).sort(); // ascending
  }, [data]);

  /* 2 ───────── state: chosen day & user filter ─────────── */
  const [selDay, setSelDay] = useState(''); // Initialize as blank
  const [filter, setFilter] = useState('All');

  /* Update selDay intelligently when 'days' array changes */
  useEffect(() => {
    if (days.length > 0) {
      const latestDay = days[days.length - 1];
      if (selDay === '') {
        // If selDay is blank (initial load or no valid day was previously selected), set to latest.
        // console.log('[BarByHour] selDay was blank, setting to latestDay:', latestDay);
        setSelDay(latestDay);
      } else {
        // If selDay was already set, check if it's still in the new 'days' list.
        const isSelDayStillValid = days.includes(selDay);
        if (!isSelDayStillValid) {
          // If the previously selected day is no longer valid (e.g., data for it disappeared),
          // then reset to the new latest day.
          // console.log(`[BarByHour] selDay '${selDay}' no longer valid, resetting to latestDay:`, latestDay);
          setSelDay(latestDay);
        }
        // If selDay is still valid, DO NOTHING, preserving the user's selection.
        // else {
        //   console.log(`[BarByHour] selDay '${selDay}' is still valid, keeping selection.`);
        // }
      }
    } else {
      // If there are no days available, clear selDay.
      if (selDay !== '') {
        // console.log('[BarByHour] No days available, clearing selDay.');
        setSelDay('');
      }
    }
  }, [days, selDay]); // selDay is added to dependencies to correctly handle its initial empty state

  /* 3 ───────── aggregate counts per hour for that day ──── */
  const series = useMemo(() => {
    const arr = emptySeries();
    if (Array.isArray(data) && selDay) { // Ensure data is an array and selDay is set
      data.forEach(p => {
        if (!p || !p.timestamp || !p.userId) return; // Basic validation for p
        if (filter !== 'All' && p.userId !== filter) return;
        if (dayjs(p.timestamp).format('YYYY-MM-DD') !== selDay) return;

        const h = dayjs(p.timestamp).hour();
        if (arr[h]) { // Check if arr[h] exists
            arr[h].value += 1;
        }
      });
    }
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
          onChange={e => setSelDay(e.target.value)} // User manually changes the day
          style={{ marginLeft: 12 }}
          disabled={days.length === 0} // Disable if no days to select
        >
          {days.map(d => (
            <option key={d} value={d}>
              {dayjs(d).format('DD MMM')}
            </option>
          ))}
          {days.length === 0 && <option value="">No data</option>}
        </select>
      </div>

      {/* chart */}
      <div className="bar-wrap">
        {selDay && days.length > 0 ? ( // Only render chart if a day is selected and days are available
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={series}
              margin={{ top: 10, right: 16, left: 24, bottom: 32 }}
            >
              <XAxis
                dataKey="hr"
                tickFormatter={h => `${h}:00`}
                interval={0} // Show all hour ticks
                tick={{ fontSize: 10 }}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, dataMax => Math.max(1, Math.ceil(dataMax * 1.1))]} // Ensure domain is at least 1 and adds some padding
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={v => [v, 'entries']} /> {/* Changed 'words' to 'entries' or similar */}
              <Bar
                dataKey="value"
                fill={filter === 'All' ? ALL_COLOUR : (USER_COLOURS[filter] || ALL_COLOUR)} // Fallback for fill
                radius={[4, 4, 0, 0]}
                isAnimationActive={false} // Consider setting to true for smoother transitions if preferred
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-overlay">
            {days.length === 0 ? "No data available to display chart." : "Select a day to view data."}
          </div>
        )}

        {/* overlay if nothing to show for the selected day */}
        {selDay && !empty && series.every(s => s.value === 0) && (
            <div className="empty-overlay">no data for this day</div>
        )}
         {/* This specific empty message might be redundant due to the one above, but kept for now */}
         {empty && selDay && <div className="empty-overlay">no data for this day</div>}
      </div>
    </div>
  );
}