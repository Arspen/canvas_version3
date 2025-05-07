import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';
import labelMap from './labelMap.json';

import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout  from './layouts/MobileLayout';

const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const ICON_W = 40;
const ICON_H = 40;

// ─── add once, near the top of Canvas.jsx ─────────────────────────────
function visualCentre(container) {
  const vv   = window.visualViewport;
  const offX = vv ? vv.offsetLeft : 0;   // iOS toolbar / notch
  const offY = vv ? vv.offsetTop  : 0;

  const halfW = (vv ? vv.width  : window.innerWidth ) / 2;
  const halfH = (vv ? vv.height : window.innerHeight) / 2;

  return {
    x: (container?.scrollLeft || 0) + offX + halfW,
    y: (container?.scrollTop  || 0) + offY  + halfH,
  };
}



export default function Canvas({ userId }) {
  /* ------------ refs / state ------------ */
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const throttleRef  = useRef(0);
  const imgCache     = useRef({});
  const [imagesReady, setImagesReady] = useState(false);

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
          ctx.drawImage(imgCache.current[p.emoji], p.x - 20, p.y - 20, 40, 40);
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

    socket.emit('requestInitialPlacements');
    return () => {
      socket.off('initialPlacements');
      socket.off('placeEmoji');
      socket.off('markDeleted');
    };
  }, []);

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

  const handlePlaceClick = e => {
    if (!pendingWord) return;
    const vv      = window.visualViewport;
     const halfW   = (vv ? vv.width  : window.innerWidth ) / 2;
     const halfH   = (vv ? vv.height : window.innerHeight) / 2;
     const { x, y } = isMobile ? visualCentre(containerRef.current) : ptr(e);
    placeNow(x, y, pendingWord);
    setPendingWord(null);
  };

  const handleDelete = () => {
    const now = Date.now();
    if (now - throttleRef.current < 300) return;
    throttleRef.current = now;

    const { x, y } = visualCentre(containerRef.current);
    socket.emit('deletePlacement', { userId, x, y });
  };

  const submitWord = (e, close) => {
    e.preventDefault();
    const w = currentWord.trim();
    if (!w) return;
    const { x, y } = visualCentre(containerRef.current);
    placeNow(x, y, w);
    setCurrentWord('');
    setPendingWord(null);
    close && close();
  };

  /* ------------ pass props to layouts ------ */
  const common = {
    currentWord, setCurrentWord,
    handleWordSubmit: submitWord,
    canvasRef, handlePointer, handlePlaceClick,
    handleDelete, userId,
  };

  return isMobile
    ? <MobileLayout {...common} containerRef={containerRef} />
    : <DesktopLayout {...common} />;
}
