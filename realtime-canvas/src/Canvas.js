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
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

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
          drawAll(); // initial draw after loading
        }
      };
      img.onerror = () => {
        console.error("Failed to load image:", emoji);
        loadedCount++;
        if (loadedCount === allEmojis.length) {
          setImagesLoaded(true);
          drawAll();
        }
      };
    });

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

    const updateMousePosition = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left + containerRef.current.scrollLeft;
      const y = event.clientY - rect.top + containerRef.current.scrollTop;
      setMousePos({ x, y });
    };

    const updateTouchPosition = (event) => {
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      const x = touch.clientX - rect.left + containerRef.current.scrollLeft;
      const y = touch.clientY - rect.top + containerRef.current.scrollTop;
      setMousePos({ x, y });
    };

    const placeEmojiAt = (x, y) => {
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
    };

    const handleClick = (event) => {
      if (!pendingWord) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left + containerRef.current.scrollLeft;
      const y = event.clientY - rect.top + containerRef.current.scrollTop;
      placeEmojiAt(x, y);
    };

    const handleTouchStart = (event) => {
      if (!pendingWord) return;
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      const x = touch.clientX - rect.left + containerRef.current.scrollLeft;
      const y = touch.clientY - rect.top + containerRef.current.scrollTop;
      placeEmojiAt(x, y);
    };

    if (isMobile) {
      canvas.addEventListener('touchstart', handleTouchStart);
      canvas.addEventListener('touchmove', updateTouchPosition);
    } else {
      canvas.addEventListener('mousemove', updateMousePosition);
      canvas.addEventListener('click', handleClick);
    }

    socket.emit('requestInitialPlacements');

    return () => {
      if (isMobile) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', updateTouchPosition);
      } else {
        canvas.removeEventListener('mousemove', updateMousePosition);
        canvas.removeEventListener('click', handleClick);
      }
      socket.off('initialPlacements');
      socket.off('placeEmoji');
    };
  }, [pendingWord, placements, imagesLoaded, isMobile, mousePos, userId]);

  useEffect(() => {
    if (imagesLoaded) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      placements.forEach(({ word, emoji, x, y }) => {
        if (emoji && imageCache[emoji]) {
          context.drawImage(imageCache[emoji], x, y, 40, 40);
        } else {
          context.font = "32px Arial";
          context.fillText(word, x, y);
        }
      });
    }
  }, [placements, imagesLoaded]);

  useEffect(() => {
    if (imagesLoaded && pendingWord) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      placements.forEach(({ word, emoji, x, y }) => {
        if (emoji && imageCache[emoji]) {
          context.drawImage(imageCache[emoji], x, y, 40, 40);
        } else {
          context.font = "32px Arial";
          context.fillText(word, x, y);
        }
      });

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
  }, [pendingWord, mousePos, imagesLoaded]);

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
          background: '#fff'
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Canvas;
