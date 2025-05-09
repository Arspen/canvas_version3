/* Donut.jsx -------------------------------------------------------------- */
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import labelMap from '../../labelMap.json';      /* ← adjust path if needed   */
import './donut.css';

/* ---------- colour palette ---------- */
const CATEGORY_COLOURS = {
Animals: '#f5bf17',
Nature: '#05c274',
Elemental: '#094542',
Humanoid: '#85d5f6',
Objects: '#4750dd',
Structures: '#212161',
Food_Drinks: '#d3a4ea',
Unknown: '#ed564f',
Communication: '#a24571'

};

//           ── user pills ──
const USER_COLOURS = {
    P1: '#00C7BE',
    P2: '#34C759',
    P3: '#6CC7F5',
    P4: '#FF9500',
    P5: '#AF52DE',
    P6: '#FF2D55',
  };
  

/* ---------- build “word ➜ category” lookup once ---------- */
const categoryByWord = (() => {
  const out = {};
  Object.values(labelMap).forEach(({ synonyms, category }) => {
    synonyms.forEach((w) => { out[w.toLowerCase()] = category; });
  });
  return out;                         // { 'dog': 'Animal', … }
})();

/* ---------- helper counts ---------- */
function gatherCounts(list, filter) {
  const counts = { Animal:0, Structures:0, Humanoids:0, Nature:0, Unknown:0 };

  list.forEach((p) => {
    if (filter !== 'All' && p.userId !== filter) return;

    const cat = categoryByWord[p.word?.toLowerCase()] || 'Unknown';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return counts;
}

/* ====================================================================== */
export default function Donut({ data = [], filter = 'All', onFilter }) {
  const counts = useMemo(() => gatherCounts(data, filter), [data, filter]);
  const total  = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const pieData = Object.keys(counts).map((k) => ({
    name:   k,
    value:  counts[k],
    colour: CATEGORY_COLOURS[k],
  }));

  /* biggest slice for the centre label */
  const biggest = Math.max(...Object.values(counts));

  return (
    <div className="donut-card">
      {/* === filter pills ================================================= */}
      <div className="pill-row">
      {['All','P1','P2','P3','P4','P5','P6'].map((p) => {
          const active = filter === (p==='All' ? 'All' : p);
          return (
            <button
              key={p}
              className={`pill ${active? 'active':''}`}
              style={ p!=='All' ? {border:`2px solid ${USER_COLOURS[p]}`} : {} }
              onClick={() => onFilter(p==='All' ? 'All' : p)}
            >
              {p==='All' ? 'All Participants' : p}
            </button>
          );
        })}
      </div>

      {/* === donut ======================================================= */}
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              innerRadius="60%"
              outerRadius="90%"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((d) => (
                <Cell key={d.name} fill={d.colour} />
              ))}
            </Pie>
            {/* --- centre percentage --- */}
            <text
              x="50%" y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="28" fontWeight="600"
            >
              {Math.round((biggest / total) * 100)}%
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* === legend ====================================================== */}
      <div className="legend">
        {Object.keys(CATEGORY_COLOURS).map((cat) => (
          <div key={cat} className="legend-item">
            <span className="dot" style={{ background: CATEGORY_COLOURS[cat] }} />
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
}
