import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper'; // Mapping words to emoji filenames
import labelMap from './labelMap.json'; // Full labelMap with icons

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imageCache = useRef({}); 
  const animationFrameId = useRef(null);

  useEffect(() => {
    const preloadImages = () => {
      const allEmojis = Object.values(labelMap).map(data => data.emoji);
      let loadedCount = 0;

      allEmojis.forEach((emoji) => {
        if (!emoji) return;

        const img = new Image();
        img.src = `/icons/${emoji}`;

        img.onload = () => {
          imageCache.current[emoji] = img;
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
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      placements.forEach(({ word, emoji, x, y }) => {
        if (emoji && imageCache.current[emoji]) {
          context.drawImage(imageCache.current[emoji], x, y, 40, 40);
        } else {
          context.font = "32px Arial";
          context.fillText(word, x, y);
        }
      });

      if (pendingWord) {
        const pendingEmoji = getEmojiForWord(pendingWord);
        if (pendingEmoji && imageCache.current[pendingEmoji]) {
          context.globalAlpha = 0.5;
          context.drawImage(imageCache.current[pendingEmoji], mousePos.x, mousePos.y, 40, 40);
          context.globalAlpha = 1;
        } else {
          context.font = "32px Arial";
          context.globalAlpha = 0.5;
          context.fillText(pendingWord, mousePos.x, mousePos.y);
          context.globalAlpha = 1;
        }
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    animationFrameId.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [imagesLoaded, placements, pendingWord, mousePos]);

  useEffect(() => {
    socket.on('initialPlacements', (data) => {
      setPlacements(data);
    });

    socket.on('placeEmoji', (data) => {
      setPlacements((prev) => [...prev, data]);
    });

    socket.emit('requestInitialPlacements');

    return () => {
      socket.off('initialPlacements');
      socket.off('placeEmoji');
    };
  }, []);

  const handleMouseMove = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
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
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          style={{ background: '#fff' }}
        />
      </div>
    </div>
  );
};

export default Canvas;
