import './activityList.css';
import { useMemo } from 'react';

const USER_COLOURS = {
  P1: '#00C7BE',
  P2: '#34C759',
  P3: '#6CC7F5',
  P4: '#FF9500',
  P5: '#AF52DE',
  P6: '#FF2D55',
};

function niceTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityList({ data = [], filter = 'All', onFilter }) {
  /* newest first, filtered by participant */
  const rows = useMemo(() => {
    const filtered = filter === 'All' ? data : data.filter((p) => p.userId === filter);
    return [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data, filter]);

  return (
    <div className="alist-card">
      {/* participant pills (same colours as donut) */}
      <div className="pill-row">
        {['All', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map((p) => {
          const active = filter === (p === 'All' ? 'All' : p);
          return (
            <button
              key={p}
              className={`pill ${active ? 'active' : ''}`}
              style={p !== 'All' ? { border: `2px solid ${USER_COLOURS[p]}` } : {}}
              onClick={() => onFilter(p === 'All' ? 'All' : p)}
            >
              {p === 'All' ? 'All Participants' : p}
            </button>
          );
        })}
      </div>

      {/* scrollable list (no row-limit) */}
      <ul className="alist-scroll">
        {rows.map((r) => (
          <li key={r._id}>
            <span className="tag" style={{ background: USER_COLOURS[r.userId] }}>
              {r.userId}
            </span>
            {r.emoji ? (
              <img src={`/icons/${r.emoji}`} alt={r.word} />
            ) : (
              <span className="word">{r.word}</span>
            )}
            <span className="time">{niceTime(r.timestamp)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
