import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';
import labelMap from './labelMap.json';

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const isMobile = /Mobi|Android/i.test(navigator.userAgent); // detect mobile

  const imageCache = useRef({});
  const animationFrameId = useRef(null);

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

    const draw = () => {
      if (!imagesLoaded) {
        animationFrameId.current = requestAnimationFrame(draw);
        return;
      }

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

    socket.on('initialPlacements', (data) => {
      setPlacements(data);
    });

    socket.on('placeEmoji', (data) => {
      setPlacements((prev) => [...prev, data]);
    });

    const handleMouseMove = (event) => {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
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

    const handleTouchMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      setMousePos({ x, y });
    };

    const handleTouchEnd = (e) => {
      if (pendingWord) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.changedTouches[0].clientX - rect.left;
        const y = e.changedTouches[0].clientY - rect.top;

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

    // Regular desktop listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    // Add touch listeners only if on mobile
    if (isMobile) {
      canvas.addEventListener('touchmove', handleTouchMove);
      canvas.addEventListener('touchend', handleTouchEnd);
    }

    socket.emit('requestInitialPlacements');

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      if (isMobile) {
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
      socket.off('initialPlacements');
      socket.off('placeEmoji');
    };
  }, [imagesLoaded, mousePos, userId, pendingWord, placements]);

  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (currentWord.trim()) {
      setPendingWord(currentWord.trim());
      setCurrentWord("");
    }
  };

  return (
    <div>
      {isMobile && (
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 10 }}>
          <form onSubmit={handleWordSubmit} style={{ display: 'flex' }}>
            <input
              type="text"
              value={currentWord}
              onChange={(e) => setCurrentWord(e.target.value)}
              placeholder="Type a word..."
              style={{ flex: 1, padding: "10px", fontSize: "16px" }}
            />
            <button type="submit" style={{ padding: "10px" }}>
              Confirm
            </button>
          </form>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ background: '#fff', width: '100vw', height: '100vh' }}
      />
    </div>
  );
};

export default Canvas;
