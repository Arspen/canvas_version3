import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper'; // Using the existing labelMap

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);

  const imageCache = {}; // 🔥 Cache for preloaded images

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    const drawAll = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw all already placed icons
      placements.forEach(({ word, emoji, x, y }) => {
        if (emoji) {
          if (imageCache[emoji]) {
            context.drawImage(imageCache[emoji], x, y, 40, 40);
          } else {
            const img = new Image();
            img.src = `/icons/${emoji}`;
            img.onload = () => {
              imageCache[emoji] = img;
              context.drawImage(img, x, y, 40, 40);
            };
          }
        } else {
          context.font = "32px Arial";
          context.globalAlpha = 1;
          context.fillText(word, x, y);
        }
      });

      // Draw pending word hovering
      if (pendingWord) {
        const pendingEmoji = getEmojiForWord(pendingWord);
        if (pendingEmoji) {
          if (imageCache[pendingEmoji]) {
            context.globalAlpha = 0.5;
            context.drawImage(imageCache[pendingEmoji], mousePos.x, mousePos.y, 40, 40);
            context.globalAlpha = 1;
          } else {
            const img = new Image();
            img.src = `/icons/${pendingEmoji}`;
            img.onload = () => {
              imageCache[pendingEmoji] = img;
              context.globalAlpha = 0.5;
              context.drawImage(img, mousePos.x, mousePos.y, 40, 40);
              context.globalAlpha = 1;
            };
          }
        } else {
          context.font = "32px Arial";
          context.globalAlpha = 0.5;
          context.fillText(pendingWord, mousePos.x, mousePos.y);
          context.globalAlpha = 1;
        }
      }
    };

    const interval = setInterval(drawAll, 30); // Redraw canvas every 30ms

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
  }, [pendingWord, mousePos, userId, placements]);

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
