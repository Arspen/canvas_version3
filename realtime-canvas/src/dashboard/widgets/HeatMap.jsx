import { useEffect, useState } from 'react';
import './heatMap.css';          // simple CSS grid

const GRID_W = 50;   // 2000 / 40
const GRID_H = 38;   // 1500 / 40

function cellColour(n, max) {
  if (!n) return 'transparent';
  const alpha = n / max;                 // 0‒1
  return `rgba(30,144,255, ${alpha})`;   // DodgerBlue
}

export default function HeatMap({ filter }) {
  const [cells, setCells] = useState({});   // key -> count

  useEffect(() => {
    fetch(`/api/heatmap${filter!=='All' ? `?uid=${filter}` : ''}`)
      .then(r => r.json())
      .then(arr => {
         const obj = {};
         arr.forEach(({ _id:{x,y}, n }) => { obj[`${x}_${y}`] = n; });
         setCells(obj);
      });
  }, [filter]);                 // re-fetch each 5 s in DashboardApp loop

  const max = Math.max(...Object.values(cells), 1);   // avoid div-by-0

  return (
    <div className="hm-grid">
      {Array.from({ length: GRID_H }, (_, row) =>
        Array.from({ length: GRID_W }, (_, col) => {
          const key = `${col}_${row}`;
          return (
            <div key={key}
                 className="hm-cell"
                 style={{ background: cellColour(cells[key], max) }}
            />
          );
        })
      )}
    </div>
  );
}
