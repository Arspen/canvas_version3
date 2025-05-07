
import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';
import labelMap from './labelMap.json';

import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';

const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

const Canvas = ({ userId }) => {
  // refs & state common to both layouts
  const canvasRef = useRef(null);
  const throttleRef = useRef(0);
  const containerRef = useRef(null); // only used by mobile
  const imageCache = useRef({});
  const [imagesReady, setImagesReady] = useState(false);

  const [placements, setPlacements] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ---------- image preload one-time ---------- */
  useEffect(() => {
    const list = Object.values(labelMap).map((d) => d.emoji);
    let loaded = 0;
    list.forEach((file) => {
      if (!file) return;
      const img = new Image();
      img.src = `/icons/${file}`;
      img.onload = img.onerror = () => {
        imageCache.current[file] = img;
        loaded++;
        if (loaded === list.length) setImagesReady(true);
      };
    });
  }, []);

  /* ---------- canvas drawing loop ---------- */
  useEffect(() => {
    if (!imagesReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    let id;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      placements.forEach(({ word, emoji, x, y }) => {
        if (emoji && imageCache.current[emoji]) {
          ctx.drawImage(imageCache.current[emoji], x-20, y+12, 40, 40);
        } else {
          ctx.font = '32px Arial';
          ctx.textAlign = 'center'
          ctx.textBaseLine = 'middle';
          ctx.fillText(word, x, y);
        }
      });

      if (pendingWord) {
        const pendingEmoji = getEmojiForWord(pendingWord);
        ctx.globalAlpha = 0.5;
        if (pendingEmoji && imageCache.current[pendingEmoji]) {
          ctx.drawImage(
            imageCache.current[pendingEmoji],
            mousePos.x,
            mousePos.y,
            40,
            40,
          );
        } else {
          ctx.font = '32px Arial';
          ctx.fillText(pendingWord, mousePos.x, mousePos.y);
        }
        ctx.globalAlpha = 1;
      }
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [imagesReady, placements, pendingWord, mousePos]);

  /* ---------- sockets ---------- */
  useEffect(() => {
    const deletedIds = new Set();
    socket.on('initialPlacements', raw => {
      setPlacements(
            raw.map(r => ({ ...r, _id: String(r._id) }))   // stringify every _id
         );
        });


    socket.on('placeEmoji', (p) => {if (deletedIds.has(String(p._id))) return; setPlacements((prev) => [...prev, p])}
    );

    socket.on('markDeleted', id => {
      deletedIds.add(String(id));        // remember it
        setPlacements(prev => prev.filter(r => r._id !== String(id)));
      });

    socket.emit('requestInitialPlacements');

    return () => {
      socket.off('initialPlacements');
      socket.off('placeEmoji');
      socket.off('markDeleted');
    };
  }, []);

  /* ---------- pointer helpers ---------- */
  const translatePointer = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollX = containerRef.current ? containerRef.current.scrollLeft : 0;
    const scrollY = containerRef.current ? containerRef.current.scrollTop : 0;
    return {
      x: (e.clientX || e.touches?.[0].clientX) - rect.left + scrollX,
      y: (e.clientY || e.touches?.[0].clientY) - rect.top + scrollY,
    };
  };

  const handlePointer = (e) => setMousePos(translatePointer(e));
  const handlePlaceClick = (e) => {
    if (!pendingWord) return;
  
    let x, y;
  
    if (isMobile) {
      // place at screen-centre “target”
      const scrollX = containerRef.current ? containerRef.current.scrollLeft : 0;
      const scrollY = containerRef.current ? containerRef.current.scrollTop  : 0;
      const rect = containerRef.current
        ? containerRef.current.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
  
      x = scrollX + rect.width  / 2;
      y = scrollY + rect.height / 2;
    } else {
      // desktop: click position
      ({ x, y } = translatePointer(e));
    }
  
    const emoji = getEmojiForWord(pendingWord);
  
    socket.emit('placeEmoji', {
      word: pendingWord,
      emoji: emoji || null,
      x,
      y,
      userId,
    });
  
    setPendingWord(null);
  };

  const handleDelete = () => {
        const now = Date.now();
        if (now - throttleRef.current < 300) return;   // ignore burst taps
        throttleRef.current = now;
    
        const centreX = containerRef.current.scrollLeft + window.innerWidth  / 2;
        const centreY = containerRef.current.scrollTop  + window.innerHeight / 2;
    
        socket.emit('deletePlacement', { userId, x: centreX, y: centreY });
      };
    
  /*
    const handlePlaceClick = (e) => {
    if (!pendingWord) return;
    const scrollX = containerRef.current.scrollLeft;
    const scrollY = containerRef.current.scrollTop;
    const rect = containerRef.current.getBoundingClientRect();
    const x = scrollX + rect.width / 2;
    const y = scrollY + rect.height / 2;
    const emoji = getEmojiForWord(pendingWord);

    socket.emit('placeEmoji', {
      word: pendingWord,
      emoji: emoji || null,
      x,
      y,
      userId,
    });
    setPendingWord(null);
  };*/

  /* ---------- word form ---------- */
  /*
  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (currentWord.trim()) {
      setPendingWord(currentWord.trim());
      setCurrentWord('');
    }
  };*/
  const handleWordSubmit = (e, closeSheet /* bool – mobile only */) => {
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
    const y = scrollY + rect.height / 2;
  
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
  

  /* ---------- render ---------- */
  const commonProps = {
    currentWord,
    setCurrentWord,
    handleWordSubmit,
    canvasRef,
    handlePointer,
    handlePlaceClick,
    handleDelete,
    userId,
  };

  return isMobile ? (
    <MobileLayout {...commonProps} containerRef={containerRef} />
  ) : (
    <DesktopLayout {...commonProps} />
  );
};

export default Canvas;