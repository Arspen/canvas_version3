import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper'; // Mapping words to emoji filenames
import labelMap from './labelMap.json'; // Also import full labelMap

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const imageCache = {}; // Cache for preloaded images

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    // --- Preload all images at startup ---
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

    preloadImages(); // ⬅️ preload immediately

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
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePos({ x, y });
    };

    const handleClick = () => {
      if (pendingWord) {
        const emoji = getEmojiForWord(pendingWord);
        const { x, y } = mousePos;

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

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    socket.emit('requestInitialPlacements');

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      socket.off('initialPlacements');
      socket.off('placeEmoji');
      clearInterval(interval);
    };
  }, [pendingWord, mousePos, userId, placements, imagesLoaded]); // ← added imagesLoaded

  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (currentWord.trim()) {
      setPendingWord(currentWord.trim());
      setCurrentWord("");
    }
  };

  return (
    <div>
      <form onSubmit={handleWordSubmit} style={{ marginBottom: "10px" }}>
        <input
          type="text"
          value={currentWord}
          onChange={(e) => setCurrentWord(e.target.value)}
          placeholder="Type a word..."
          style={{ padding: "8px", fontSize: "16px" }}
        />
        <button type="submit" style={{ marginLeft: "10px", padding: "8px" }}>
          Confirm
        </button>
      </form>

      <div style={{ overflow: 'scroll', border: '1px solid black', height: '80vh', width: '80vw' }}>
        <canvas ref={canvasRef} style={{ background: '#fff' }} />
      </div>
    </div>
  );
};

export default Canvas;
