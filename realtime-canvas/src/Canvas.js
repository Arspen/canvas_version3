import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';
import labelMap from './labelMap.json';

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const imageCache = {};

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    checkIfMobile();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    const preloadImages = () => {
      const allEmojis = Object.values(labelMap).map(data => data.emoji);
      let loadedCount = 0;

      allEmojis.forEach((emoji) => {
        if (!emoji) return;
        const img = new Image();
        img.src = `/icons/${emoji}`;
        img.onload = () => {
          imageCache[emoji] = img;
          loadedCount++;
          if (loadedCount === allEmojis.length) {
            setImagesLoaded(true);
          }
        };
        img.onerror = () => {
          console.error("Failed to load image:", emoji);
          loadedCount++;
          if (loadedCount === allEmojis.length) {
            setImagesLoaded(true);
          }
        };
      });
    };

    preloadImages();

    const drawAll = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      placements.forEach(({ word, emoji, x, y }) => {
        if (emoji && imageCache[emoji]) {
          context.drawImage(imageCache[emoji], x, y, 40, 40);
        } else {
          context.font = "32px Arial";
          context.globalAlpha = 1;
          context.fillText(word, x, y);
        }
      });

      if (pendingWord) {
        const pendingEmoji = getEmojiForWord(pendingWord);
        if (pendingEmoji && imageCache[pendingEmoji]) {
          context.globalAlpha = 0.5;
          context.drawImage(imageCache[pendingEmoji], mousePos.x, mousePos.y, 40, 40);
          context.globalAlpha = 1;
        } else {
          context.font = "32px Arial";
          context.globalAlpha = 0.5;
          context.fillText(pendingWord, mousePos.x, mousePos.y);
          context.globalAlpha = 1;
        }
      }
    };

    const interval = setInterval(() => {
      if (imagesLoaded) {
        drawAll();
      }
    }, 30);

    socket.on('initialPlacements', (data) => {
      setPlacements(data);
    });

    socket.on('placeEmoji', (data) => {
      setPlacements((prev) => [...prev, data]);
    });

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left + containerRef.current.scrollLeft;
      const y = event.clientY - rect.top + containerRef.current.scrollTop;
      setMousePos({ x, y });
    };

    const handleClick = (event) => {
      if (pendingWord) {
        const rect = canvas.getBoundingClientRect();
        const x = (isMobile ? event.touches?.[0]?.clientX : event.clientX) - rect.left + containerRef.current.scrollLeft;
        const y = (isMobile ? event.touches?.[0]?.clientY : event.clientY) - rect.top + containerRef.current.scrollTop;

        const emoji = getEmojiForWord(pendingWord);
        const newPlacement = {
          word: pendingWord,
          emoji: emoji || null,
          x,
          y,
          userId,
        };

        socket.emit('placeEmoji', newPlacement);
        setPendingWord(null);
      }
    };

    if (isMobile) {
      canvas.addEventListener('touchmove', handleMouseMove);
      canvas.addEventListener('touchstart', handleClick);
    } else {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
    }

    socket.emit('requestInitialPlacements');

    return () => {
      if (isMobile) {
        canvas.removeEventListener('touchmove', handleMouseMove);
        canvas.removeEventListener('touchstart', handleClick);
      } else {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
      }
      socket.off('initialPlacements');
      socket.off('placeEmoji');
      clearInterval(interval);
    };
  }, [pendingWord, mousePos, userId, placements, imagesLoaded, isMobile]);

  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (currentWord.trim()) {
      setPendingWord(currentWord.trim());
      setCurrentWord("");
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <form
        onSubmit={handleWordSubmit}
        style={{
          padding: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <input
          type="text"
          value={currentWord}
          onChange={(e) => setCurrentWord(e.target.value)}
          placeholder="Type a word..."
          style={{ padding: "8px", fontSize: "16px", width: '60%' }}
        />
        <button type="submit" style={{ marginLeft: "10px", padding: "8px" }}>
          Confirm
        </button>
      </form>

      <div
        ref={containerRef}
        style={{
          flexGrow: 1,
          overflow: 'scroll',
          border: '1px solid black',
          background: '#fff',
          touchAction: 'none'
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Canvas;
