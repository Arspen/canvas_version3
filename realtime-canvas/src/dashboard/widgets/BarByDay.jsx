import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import dayjs from 'dayjs';

const USER_COLOURS = {
  'All': '#14b8a6',
  P1: '#000000',
  P2: '#10b981',
  P3: '#3b82f6',
  P4: '#f59e0b',
  P5: '#a855f7',
  P6: '#ef4444',
};

function aggregatePerDay(data, filter) {
  const counts = {};                                // { '2025-04-27': 12, … }
  data.forEach((p) => {
    if (filter !== 'All' && p.userId !== filter) return;
    const day = dayjs(p.timestamp).format('YYYY-MM-DD');
    counts[day] = (counts[day] || 0) + 1;
  });
  // convert to recharts-friendly array sorted by date
  return Object.keys(counts)
    .sort()
    .map((key) => ({ day: key, count: counts[key] }));
}

export default function BarByDay({ data = [], filter = 'All' }) {
  // memoise so we don’t recalc on every re-render
  const chartData = useMemo(() => aggregatePerDay(data, filter), [data, filter]);

  if (!chartData.length) {
    return <div style={{textAlign:'center',padding:'2rem'}}>loading…</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="day"
          tickFormatter={(d) => dayjs(d).format('D MMM')}
          stroke="#666"
        />
        <YAxis allowDecimals={false} stroke="#666" />
        <Tooltip
          formatter={(v) => [`${v} word${v !== 1 ? 's' : ''}`, 'Placed']}
          labelFormatter={(d) => dayjs(d).format('dddd, D MMM YYYY')}
        />
        <Bar
          dataKey="count"
          fill={USER_COLOURS[filter] || USER_COLOURS.All}
          radius={[4, 4, 0, 0]}
        >
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={USER_COLOURS[filter] || USER_COLOURS.All}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
