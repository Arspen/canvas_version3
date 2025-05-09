/* HeatMap – 40×40-px bucket heat-map (Consistent Canvas Size)
   =============================================================== */
   import React, { useEffect, useState, useMemo } from 'react';
   import './heatMap.css'; // Ensure this file exists
   
   const USER_COLOURS = {
     P1: '#00C7BE', P2: '#34C759', P3: '#6CC7F5',
     P4: '#FF9500', P5: '#AF52DE', P6: '#FF2D55',
     UNKNOWN: '#808080'
   };
   
   const BUCKET_PIXEL_SIZE = 20;
   
   export default function HeatMap() {
     const [filter, setFilter] = useState('All');
     const [rawData, setRawData] = useState([]); // Data for the currently selected filter
     const [globalViewPortConfig, setGlobalViewPortConfig] = useState(null); // Stores {minX, maxX, minY, maxY, W, H}
     const [isLoading, setIsLoading] = useState(true);
     const [error, setError] = useState(null);
   
     // Effect to determine global viewport and then fetch current filter's data
     useEffect(() => {
       let alive = true;
       setIsLoading(true);
       setError(null);
       // console.log(`[HeatMap Effect] Filter changed to: ${filter}. Global viewport set: ${!!globalViewPortConfig}`);
   
       const fetchDataForFilter = async (currentFilterToLoad) => {
         // console.log(`[HeatMap Effect] Fetching data for actual filter: ${currentFilterToLoad}`);
         try {
           const q = currentFilterToLoad === 'All' ? '' : `?uid=${currentFilterToLoad}`;
           const res = await fetch(`/api/heatmap${q}`);
           if (!res.ok) {
             const errorText = await res.text();
             throw new Error(`HTTP error! status: ${res.status} for filter ${currentFilterToLoad}, message: ${errorText}`);
           }
           const json = await res.json();
           if (alive) {
             // console.log(`[HeatMap Effect] API Response for ${currentFilterToLoad}:`, JSON.parse(JSON.stringify(json)));
             setRawData(json || []);
             setIsLoading(false);
           }
         } catch (e) {
           console.error(`[HeatMap Effect] Failed to fetch data for filter ${currentFilterToLoad}:`, e);
           if (alive) {
             setRawData([]); // Clear data on error for this filter
             setError(e.message || `Failed to fetch data for ${currentFilterToLoad}`);
             setIsLoading(false); // Stop loading on error
           }
         }
       };
   
       const establishGlobalViewportAndLoadData = async () => {
         let currentGlobalVP = globalViewPortConfig;
   
         if (!currentGlobalVP) {
           // console.log("[HeatMap Effect] Global viewport not set. Fetching 'All' data to establish it.");
           try {
             const res = await fetch(`/api/heatmap`); // Fetch "All" data
             if (!res.ok) {
               const errorText = await res.text();
               throw new Error(`HTTP error! status: ${res.status} for global extent, message: ${errorText}`);
             }
             const allUsersData = await res.json();
             if (alive && Array.isArray(allUsersData)) {
               // console.log("[HeatMap Effect] 'All' data for global viewport:", JSON.parse(JSON.stringify(allUsersData)));
               const allXCoords = allUsersData.map(c => c?.x ?? 0);
               const allYCoords = allUsersData.map(c => c?.y ?? 0);
   
               const gminX = allXCoords.length > 0 ? Math.min(...allXCoords) : 0;
               let gmaxX = allXCoords.length > 0 ? Math.max(...allXCoords) : 0;
               const gminY = allYCoords.length > 0 ? Math.min(...allYCoords) : 0;
               let gmaxY = allYCoords.length > 0 ? Math.max(...allYCoords) : 0;
               
               if (allXCoords.length > 0 && gminX === gmaxX) gmaxX = gminX; // Ensure at least 1 cell width
               if (allYCoords.length > 0 && gminY === gmaxY) gmaxY = gminY; // Ensure at least 1 cell height
   
               const gW = allXCoords.length > 0 ? (gmaxX - gminX + 1) * BUCKET_PIXEL_SIZE : 200; // Default W if no data
               const gH = allYCoords.length > 0 ? (gmaxY - gminY + 1) * BUCKET_PIXEL_SIZE : 200; // Default H if no data
               
               currentGlobalVP = { minX: gminX, maxX: gmaxX, minY: gminY, maxY: gmaxY, W: gW, H: gH };
               setGlobalViewPortConfig(currentGlobalVP);
               // console.log("[HeatMap Effect] Global viewport established:", currentGlobalVP);
             } else if (alive) {
                // Handle case where "All" data is not an array or empty, set a default viewport
               console.warn("[HeatMap Effect] 'All' data for global viewport was not an array or empty. Using default viewport.");
               currentGlobalVP = { minX: 0, maxX: 9, minY: 0, maxY: 9, W: 200, H: 200 }; // Default 10x10 grid
               setGlobalViewPortConfig(currentGlobalVP);
             }
           } catch (e) {
             console.error('[HeatMap Effect] Failed to fetch "All" data for global viewport:', e);
             if (alive) {
               setError(e.message || 'Failed to establish global view');
               // Set a default viewport on error to prevent app from breaking
               currentGlobalVP = { minX: 0, maxX: 9, minY: 0, maxY: 9, W: 200, H: 200 }; // Default 10x10 grid
               setGlobalViewPortConfig(currentGlobalVP);
               setIsLoading(false); // Stop loading
               // No return here, allow it to try and fetch current filter data with default VP
             } else {
               return; // Component unmounted
             }
           }
         }
         
         // If global viewport is now set (either previously or just now), fetch data for the current filter
         if (currentGlobalVP) {
           await fetchDataForFilter(filter);
         } else if (alive) {
           // This case should ideally not be reached if defaults are set on error/empty 'All' data
           console.warn("[HeatMap Effect] Global viewport still not set, cannot fetch filtered data.");
           setIsLoading(false);
         }
       };
   
       establishGlobalViewportAndLoadData();
       
       const intervalId = setInterval(() => {
           // console.log(`[HeatMap Interval] Re-fetching for filter: ${filter} with globalVP: ${!!globalViewPortConfig}`);
           if (globalViewPortConfig) { // Only fetch if global viewport is established
               fetchDataForFilter(filter);
           } else {
               // If global viewport isn't set, the main logic will try to set it first
               establishGlobalViewportAndLoadData();
           }
       }, 5000);
   
   
       return () => {
         alive = false;
         clearInterval(intervalId);
         // console.log("[HeatMap Effect] Cleanup.");
       };
     }, [filter]); // Re-run when filter changes. globalViewPortConfig is managed internally.
   
     // Memoized calculation for processed cells based on rawData (for the current filter)
     const { processedCells, maxTotalNForFilter } = useMemo(() => {
       // console.log('[HeatMap Memo ProcessedCells] Input rawData for filter:', JSON.parse(JSON.stringify(rawData)));
       if (!Array.isArray(rawData)) {
         return { processedCells: [], maxTotalNForFilter: 1 };
       }
   
       let currentFilterMaxTotalN = 0;
       const cellsData = rawData
         .filter(item => typeof item.x === 'number' && typeof item.y === 'number' && Array.isArray(item.activities))
         .map(item => {
           const validActivities = item.activities.filter(act => act && typeof act.uid === 'string' && typeof act.n === 'number' && act.n > 0);
           const currentCellTotalN = item.totalN || validActivities.reduce((sum, act) => sum + act.n, 0);
           
           if (currentCellTotalN > 0) {
               currentFilterMaxTotalN = Math.max(currentFilterMaxTotalN, currentCellTotalN);
           }
           return { x: item.x, y: item.y, activities: validActivities, totalN: currentCellTotalN };
         })
         .filter(cell => cell.totalN > 0);
   
       // console.log('[HeatMap Memo ProcessedCells] Filtered cellsData:', cellsData);
       // console.log('[HeatMap Memo ProcessedCells] MaxTotalN for current filter:', currentFilterMaxTotalN);
   
       return {
         processedCells: cellsData,
         maxTotalNForFilter: currentFilterMaxTotalN > 0 ? currentFilterMaxTotalN : 1,
       };
     }, [rawData]);
   
   
     const hexToRgb = (hex) => {
       const bigint = parseInt(hex.slice(1), 16);
       return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
     };
   
     const getCellFillColour = (cellActivities, cellTotalN, maxNToScaleAgainst, currentFilterType) => {
       if (!cellActivities || cellActivities.length === 0 || cellTotalN === 0) return 'rgba(0,0,0,0)';
   
       let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
   
       if (currentFilterType === 'All') {
         cellActivities.forEach(act => {
           const [r, g, b] = hexToRgb(USER_COLOURS[act.uid] || USER_COLOURS.UNKNOWN);
           rSum += r * act.n; gSum += g * act.n; bSum += b * act.n; weightSum += act.n;
         });
         if (weightSum === 0) return 'rgba(0,0,0,0)';
         const alpha = (0.15 + 0.85 * Math.min(1, cellTotalN / maxNToScaleAgainst)).toFixed(2);
         return `rgba(${Math.round(rSum / weightSum)},${Math.round(gSum / weightSum)},${Math.round(bSum / weightSum)},${alpha})`;
       } else {
         const act = cellActivities[0];
         if (!act) return 'rgba(0,0,0,0)';
         const [r, g, b] = hexToRgb(USER_COLOURS[act.uid] || USER_COLOURS.UNKNOWN);
         const alpha = (0.15 + 0.85 * Math.min(1, act.n / maxNToScaleAgainst)).toFixed(2);
         return `rgba(${r},${g},${b},${alpha})`;
       }
     };
     
     let displayContent;
     const currentViewPort = globalViewPortConfig || { W: 200, H: 200, minX: 0, minY: 0 }; // Fallback for initial render
   
     if (isLoading && !globalViewPortConfig) { // Show loading only if global VP is not yet established
       displayContent = <div className="empty-msg">Initializing heatmap and loading data...</div>;
     } else if (isLoading) { // Loading data for a specific filter, but global VP is set
       displayContent = <div className="empty-msg">Loading data for {filter}...</div>;
     } else if (error) {
       displayContent = <div className="empty-msg">Error: {error}</div>;
     } else if (!globalViewPortConfig) {
       // This case should ideally be covered by loading/error, but as a fallback
       displayContent = <div className="empty-msg">Heatmap configuration not available.</div>;
     } else if (processedCells.length === 0) {
       displayContent = <div className="empty-msg">No data available for {filter}.</div>;
     } else if (currentViewPort.W === 0 || currentViewPort.H === 0) {
       displayContent = <div className="empty-msg">Cannot render heatmap: invalid dimensions.</div>;
     } else {
       displayContent = (
         <svg width={currentViewPort.W} height={currentViewPort.H} xmlns="http://www.w3.org/2000/svg">
           {processedCells.map((cell) => (
             <rect
               key={`${cell.x}-${cell.y}`}
               x={(cell.x - currentViewPort.minX) * BUCKET_PIXEL_SIZE}
               y={(cell.y - currentViewPort.minY) * BUCKET_PIXEL_SIZE}
               width={BUCKET_PIXEL_SIZE}
               height={BUCKET_PIXEL_SIZE}
               fill={getCellFillColour(cell.activities, cell.totalN, maxTotalNForFilter, filter)}
             />
           ))}
         </svg>
       );
     }
   
     // console.log(`[HeatMap Render] isLoading: ${isLoading}, error: ${error}, processedCells: ${processedCells.length}, GlobalVP W/H: ${currentViewPort.W}/${currentViewPort.H}`);
   
     return (
       <div className="heat-card">
         <div className="pill-row">
           {['All', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(p => (
             <button
               key={p}
               className={`pill ${filter === p ? 'active' : ''}`}
               style={p !== 'All' && USER_COLOURS[p] ? { borderColor: USER_COLOURS[p] } : {}}
               onClick={() => setFilter(p)}
               disabled={isLoading} // Disable pills while loading
             >
               {p === 'All' ? 'All participants' : p}
             </button>
           ))}
         </div>
         <div className="svg-wrap" style={{ width: currentViewPort.W, height: currentViewPort.H }}>
           {displayContent}
         </div>
       </div>
     );
   }
   