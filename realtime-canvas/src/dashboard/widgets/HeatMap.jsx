/* HeatMap – 40×40-px bucket heat-map
   =============================================================== */
   import {
    useEffect,
    useState,
    useMemo
  } from 'react';
  import './heatMap.css'; // styles below
  
  const USER_COLOURS = {
    P1: '#00C7BE',
    P2: '#34C759',
    P3: '#6CC7F5',
    P4: '#FF9500',
    P5: '#AF52DE',
    P6: '#FF2D55',
  };
  
  export default function HeatMap() {
    const [filter, setFilter] = useState('All');
    const [data, setData] = useState([]); // raw cells
  
    /* ----- polling every 5 s ------------------------------------ */
    useEffect(() => {
      let alive = true;
  
      const load = async () => {
        try {
          const q = filter === 'All' ? '' : `?uid=${filter}`;
          const res = await fetch(`/api/heatmap${q}`);
          const json = await res.json();
          if (alive) {
            setData(json);
            console.log('[HeatMap] useEffect - Fetched data:', json); // Log the fetched data
          }
        } catch (e) {
          console.error(e);
        }
      };
      load();
      const id = setInterval(load, 5000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [filter]);
  
    /* ----- build a sparse matrix & uid lookup -------------------------------- */
    const {
      cells,
      max,
      uidMap
    } = useMemo(() => {
      const map = new Map(); // "x,y" → n
      const uidLookup = new Map(); // "x,y" → uid
      let m = 0;
      data.forEach(c => {
        // Safest way to access coordinates
        const gx = c?._id?.x;
        const gy = c?._id?.y;
        const uid = c?._id?.uid;
  
        if (gx !== undefined && gy !== undefined && uid !== undefined) {
          const key = `${gx},${gy}`;
          map.set(key, c.n);
          uidLookup.set(key, uid + key, uid); // Store the uid with a combined key
          m = Math.max(m, c.n);
        } else {
          console.warn('[HeatMap] useMemo - Incomplete data:', c);
        }
      });
      console.log('[HeatMap] useMemo - uidLookup:', uidLookup); // Log the uidLookup
      return {
        cells: map,
        max: m,
        uidMap: uidLookup
      };
    }, [data]);
  
    /* ----- colour helper (0…max → rgba) ------------------------- */
    const colour = (n, key) => { // Take key as argument
      if (!max) return 'rgba(0,0,0,0)';
      const alpha = (0.25 + 0.75 * n / max).toFixed(2);
      let base;
      if (filter === 'All') {
        const uidKey = uidMap.get(key); // Get uid from lookup
        const uid = uidKey ? uidKey.split(',')[0] : null;
  
        console.log(`[HeatMap] colour - key: ${key}, uid: ${uid}, USER_COLOURS[uid]: ${USER_COLOURS[uid]}`); // Detailed log
  
        base = USER_COLOURS[uid] || '#808080'; // Use user color, fallback to grey
      } else {
        base = USER_COLOURS[filter];
      }
      /* convert HEX → r,g,b */
      const r = parseInt(base.slice(1, 3), 16);
      const g = parseInt(base.slice(3, 5), 16);
      const b = parseInt(base.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };
  
    /* ----- find extent so the svg is tight ---------------------- */
    const xs = data.map(c => c._id.x),
      ys = data.map(c => c._id.y);
    const minX = Math.min(...xs, 0),
      maxX = Math.max(...xs, 20);
    const minY = Math.min(...ys, 0),
      maxY = Math.max(...ys, 15);
    const W = (maxX - minX + 1) * 20; // 20 = half icon-size, keeps it compact
    const H = (maxY - minY + 1) * 20;
  
    return (
      <div className="heat-card">
        {/* pills -------------------------------------------------- */}
        <div className="pill-row">
          {['All', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(p => {
            const active = filter === p;
            return (
              <button
                key={p}
                className={`pill ${active ? 'active' : ''}`}
                style={p !== 'All' ? {
                  border: `2px solid ${USER_COLOURS[p]}`
                } : {}}
                onClick={() => setFilter(p)}
              >
                {p === 'All' ? 'All participants' : p}
              </button>
            );
          })}
        </div>
  
        {/* mini-svg grid ---------------------------------------- */}
        <div className="svg-wrap">
          <svg width={W} height={H}>
            {Array.from(cells.entries()).map(([k, n]) => {
              const [gx, gy] = k.split(',').map(Number);
              return (
                <rect
                  key={k}
                  x={(gx - minX) * 20}
                  y={(gy - minY) * 20}
                  width={20}
                  height={20}
                  fill={colour(n, k)} // Pass the key to colour()
                />
              );
            })}
          </svg>
          {data.length === 0 && <div className="empty-msg">no data</div>}
        </div>
      </div>
    );
  }