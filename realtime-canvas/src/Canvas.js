import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';
import labelMap from './labelMap.json';
import QueryOverlay from './QueryOverlay';
import {BACKEND} from './socket';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout  from './layouts/MobileLayout';

const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const ICON_W = 40;
const ICON_H = 40;

export default function Canvas({ userId }) {
  /* ------------ refs / state ------------ */
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const throttleRef  = useRef(0);
  const imgCache     = useRef({});
  const [imagesReady, setImagesReady] = useState(false);
  const [pendingQ, setPendingQ] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos,    setMousePos]    = useState({ x: 0, y: 0 });

  /* ------------ preload icons once ------- */
  useEffect(() => {
    const list = Object.values(labelMap).map(d => d.emoji).filter(Boolean);
    let loaded = 0;
    list.forEach(f => {
      const img = new Image();
      img.src = `/icons/${f}`;
      img.onload = img.onerror = () => {
        imgCache.current[f] = img;
        if (++loaded === list.length) setImagesReady(true);
      };
    });
  }, []);

  /* ------------ draw loop ---------------- */
  useEffect(() => {
    if (!imagesReady) return;
    const c = canvasRef.current, ctx = c.getContext('2d');
    c.width = 2000; c.height = 1500;

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);

      placements.forEach(p => {
        if (p.emoji && imgCache.current[p.emoji]) {
          ctx.drawImage(imgCache.current[p.emoji], p.x - 20, p.y-14, 40, 40);
        } else {
          ctx.font = '32px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(p.word, p.x, p.y);
        }
      });

      if (pendingWord) {
        const e = getEmojiForWord(pendingWord);
        ctx.globalAlpha = 0.5;
        if (e && imgCache.current[e]) {
          ctx.drawImage(imgCache.current[e], mousePos.x, mousePos.y, 40, 40);
        } else {
          ctx.font = '32px Arial';
          ctx.fillText(pendingWord, mousePos.x, mousePos.y);
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(draw);
    };
    draw();
  }, [imagesReady, placements, pendingWord, mousePos]);

  /* ------------ sockets ------------------ */
  useEffect(() => {
    /* keep a set of already-deleted ids – avoids “ghost” icons                 */
    const gone = new Set();

    socket.on('initialPlacements', raw =>
      setPlacements(raw.map(d => ({ ...d, _id: String(d._id) })))
    );

    socket.on('placeEmoji', doc => {
      const id = String(doc._id);
      if (gone.has(id)) return;                 // it was already deleted
      setPlacements(prev =>
        prev.some(r => r._id === id) ? prev : [...prev, { ...doc, _id: id }],
      );
    });

    socket.on('markDeleted', id => {
      gone.add(id);
      setPlacements(prev => prev.filter(p => p._id !== id));
    });
    socket.on('newQuery', q=>{
      if(q.answered) return;
      if(q.target==='all' || q.target===userId) setPendingQ(q);
    });
    socket.on('queryAnswered', q=>{
      if(pendingQ && q._id===pendingQ._id) setPendingQ(null);
    });

    socket.emit('requestInitialPlacements');
    return () => {
      socket.off('initialPlacements');
      socket.off('placeEmoji');
      socket.off('markDeleted');
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `${BACKEND}/api/pending-query?uid=${encodeURIComponent(userId)}`;
        const res = await fetch(url);
        const json = await res.json();              // { _id, question }  or  {}
        if (alive && json._id) setPendingQ(json);   // <= existing state setter
      } catch (e) { console.error(e); }
    })();
    return () => { alive = false; };
  }, [userId]);

  /* ------------ helpers ------------------ */
  const ptr = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = containerRef.current?.scrollLeft || 0;
    const sy = containerRef.current?.scrollTop  || 0;
    return {
      x: (e.clientX || e.touches?.[0].clientX) - rect.left + sx,
      y: (e.clientY || e.touches?.[0].clientY) - rect.top  + sy,
    };
  };

  const handlePointer = e => setMousePos(ptr(e));

  const placeNow = (x, y, word) => {
    socket.emit('placeEmoji', {
      word,
      emoji: getEmojiForWord(word) || null,
      x, y, userId,
    });
  };
  const finishQuery = (ans, declined)=>{
    socket.emit('answerQuery',{
      id: pendingQ._id,
      answer: ans,
      declined
    });
    setPendingQ(null);
  };
  const handlePlaceClick = e => {
    if (!pendingWord) return;
    const vv      = window.visualViewport;
     const halfW   = (vv ? vv.width  : window.innerWidth ) / 2;
     const halfH   = (vv ? vv.height : window.innerHeight) / 2;
     const { x, y } = isMobile
       ? {
           x: (containerRef.current?.scrollLeft || 0) + halfW,
           y: (containerRef.current?.scrollTop  || 0) + halfH,
         }
      : ptr(e);
    placeNow(x, y, pendingWord);
    setPendingWord(null);
  };

  const handleDelete = () => {
    const now = Date.now();
    if (now - throttleRef.current < 300) return;
    throttleRef.current = now;

    const x = (containerRef.current?.scrollLeft || 0) + window.innerWidth  / 2;
    const y = (containerRef.current?.scrollTop  || 0) + window.innerHeight / 2;
    socket.emit('deletePlacement', { userId, x, y });
  };

  const submitWord = (e, closeSheet /* bool – mobile only */) => {
    e.preventDefault();
    const word = currentWord.trim();
    if (!word) return;
  
    // calculate centre coordinates (regardless of tap)
    const scrollX  = containerRef.current ? containerRef.current.scrollLeft : 0;
    const scrollY  = containerRef.current ? containerRef.current.scrollTop  : 0;
    const rect     = containerRef.current
        ? containerRef.current.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
  
    const x = scrollX + rect.width  / 2;
    const y = scrollY + rect.height / 2 + 14;
  
    const emoji = getEmojiForWord(word);
  
    socket.emit('placeEmoji', {
      word,
      emoji: emoji || null,
      x,
      y,
      userId,
    });
  
    setPendingWord(null);      // nothing left to preview
    setCurrentWord('');
    if (closeSheet) closeSheet();   // slide the sheet away (mobile)
  };	 

  /* ------------ pass props to layouts ------ */
  const common = {
    currentWord, setCurrentWord,
    handleWordSubmit: submitWord,
    canvasRef, handlePointer, handlePlaceClick,
    handleDelete, userId,
  };

  return (
        <>
          {pendingQ && (
            <QueryOverlay
              q={pendingQ}
              onClose={(ans, declined)=>finishQuery(ans, declined)}
            />
          )}
          {isMobile
            ? <MobileLayout {...common} containerRef={containerRef} />
            : <DesktopLayout {...common} />}
        </>
      );
}

