import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { getEmojiForWord } from './labelMapper';

const socket = io('https://canvas-version3.onrender.com'); // <-- replace with your actual Render backend URL

const Canvas = () => {
  const canvasRef = useRef(null);
  const [pendingWord, setPendingWord] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);
  const [userId, setUserId] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageCache, setImageCache] = useState({});

  useEffect(() => {
    const user = prompt('Enter your name or ID:');
    if (user) setUserId(user);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    let animationFrameId;

    const drawAll = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      placements.forEach(placement => {
        const img = imageCache[placement.emoji];
        if (img) {
          context.drawImage(img, placement.x - 25, placement.y - 25, 50, 50);
        } else {
          context.font = '24px Arial';
          context.fillText(placement.word, placement.x, placement.y);
        }
      });

      if (pendingWord) {
        const pendingEmoji = getEmojiForWord(pendingWord.toLowerCase());
        const img = imageCache[pendingEmoji];
        if (img) {
          context.globalAlpha = 0.5;
          context.drawImage(img, mousePos.x - 25, mousePos.y - 25, 50, 50);
          context.globalAlpha = 1.0;
        } else {
          context.font = '24px Arial';
          context.fillText(pendingWord, mousePos.x, mousePos.y);
        }
      }
    };

    const render = () => {
      drawAll();
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    const handleClick = () => {
      if (pendingWord.trim() === '') return;
      const emoji = getEmojiForWord(pendingWord.toLowerCase());
      const newPlacement = {
        word: pendingWord,
        emoji: emoji || pendingWord,
        x: mousePos.x,
        y: mousePos.y,
        userId: userId
      };
      socket.emit('placeEmoji', newPlacement);
      setPendingWord('');
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    socket.on('initialPlacements', (initialPlacements) => {
      setPlacements(initialPlacements);
    });

    socket.on('placeEmoji', (placement) => {
      setPlacements(prev => [...prev, placement]);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      socket.off('initialPlacements');
      socket.off('placeEmoji');
    };
  }, [pendingWord, mousePos, userId, placements, imagesLoaded]);

  useEffect(() => {
    const cache = {};
    let loaded = 0;
    const keys = Object.keys(import.meta.glob('/public/icons/*.png'));

    const importAll = (r) => {
      r.keys().forEach((key) => {
        const img = new Image();
        img.src = key.replace('/public', '');
        img.onload = () => {
          loaded++;
          if (loaded === keys.length) {
            setImagesLoaded(true);
          }
        };
        cache[key.split('/').pop()] = img;
      });
    };

    importAll(require.context('/public/icons', false, /\.png$/));
    setImageCache(cache);
  }, []);

  return (
    <div>
      <h1>Welcome, {userId}</h1>
      <input
        type="text"
        value={pendingWord}
        onChange={(e) => setPendingWord(e.target.value)}
        placeholder="Type a word..."
      />
      <canvas ref={canvasRef} style={{ border: '1px solid black', marginTop: '10px' }} />
    </div>
  );
};

export default Canvas;
