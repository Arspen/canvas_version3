import { useEffect, useState } from 'react';
import './dashboard.css';          // ⬅️ make sure this is imported

import Donut from './widgets/Donut';
import ActivityList from './widgets/ActivityList';
import BarByHour    from './widgets/BarByHour';
import HeatMap from './widgets/HeatMap';
// …

export default function DashboardApp() {
  const [placements, setPlacements] = useState([]);
  const [filter, setFilter]         = useState('All');

  /* ---- one simple fetch every 5 s just to have data ---------------- */
  useEffect(() => {
    const fetchData = () => {
      fetch('/dashboard-data')               // <== the endpoint we set up
        .then((r) => r.json())
        .then(setPlacements)
        .catch(console.error);
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  /* ---- layout ------------------------------------------------------ */
  return (
    <div className="dash-grid">
      <Donut data={placements} filter={filter} onFilter={setFilter} />
      <ActivityList data={placements} filter={filter} onFilter={setFilter}/>
      <BarByHour data = {placements}/>
      <HeatMap filter={filter} />
      {/* You‘ll drop the other widgets in here one by one.
          Example (when you build them):
          <ActivityList data={placements} filter={filter}/>
          <BarByDay     data={placements} filter={filter}/>
          …
       */}
    </div>
  );
}
