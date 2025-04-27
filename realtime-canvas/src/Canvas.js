import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';
import labelMap from './labelMap.json';

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [pendingEmoji, setPendingEmoji] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const imageCache = {};

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
          context.fillText(word, x, y);
        }
      });

      if (pendingWord && pendingEmoji && imageCache[pendingEmoji]) {
        context.globalAlpha = 0.5;
        context.drawImage(imageCache[pendingEmoji], mousePos.x, mousePos.y, 40, 40);
        context.globalAlpha = 1;
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

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
      const y = (event.touches ? event.touches[0].clientY : event.clientY) - rect.top;
      setMousePos({ x, y });
    };

    const handlePointerClick = (event) => {
      if (pendingWord) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left;
        const y = (event.touches ? event.touches[0].clientY : event.clientY) - rect.top;

        const newPlacement = {
          word: pendingWord,
          emoji: pendingEmoji || null,
          x,
          y,
          userId,
        };

        socket.emit('placeEmoji', newPlacement);
        setPendingWord(null);
        setPendingEmoji(null);
      }
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('touchmove', handlePointerMove);
    canvas.addEventListener('click', handlePointerClick);
    canvas.addEventListener('touchend', handlePointerClick);
    socket.emit('requestInitialPlacements');

    return () => {
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('touchmove', handlePointerMove);
      canvas.removeEventListener('click', handlePointerClick);
      canvas.removeEventListener('touchend', handlePointerClick);
      socket.off('initialPlacements');
      socket.off('placeEmoji');
      clearInterval(interval);
    };
  }, [pendingWord, pendingEmoji, mousePos, userId, placements, imagesLoaded]);

  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (currentWord.trim()) {
      const word = currentWord.trim();
      const emoji = getEmojiForWord(word);
      setPendingWord(word);
      setPendingEmoji(emoji);
      setCurrentWord("");
    }
  };

  return (
    <div>
      {isMobile && (
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <form onSubmit={handleWordSubmit} style={{ display: 'flex', width: '100%' }}>
            <input
              type="text"
              value={currentWord}
              onChange={(e) => setCurrentWord(e.target.value)}
              placeholder="Type a word..."
              style={{ flex: 1, padding: "10px", fontSize: "16px" }}
            />
            <button type="submit" style={{ padding: "10px", fontSize: "16px" }}>
              Confirm
            </button>
          </form>
        </div>
      )}
      <canvas ref={canvasRef} style={{ background: '#fff', width: '100vw', height: '100vh' }} />
    </div>
  );
};

export default Canvas;
