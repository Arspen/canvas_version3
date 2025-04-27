import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import labelMap from './labelMap.json';

const backendURL = 'https://canvas-version3.onrender.com'; // change to your backend if needed
const socket = io(backendURL);

const Canvas = () => {
  const canvasRef = useRef(null);
  const [placements, setPlacements] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const username = prompt('Please enter your username:') || `User-${Math.floor(Math.random() * 10000)}`;
    setCurrentUser(username);

    socket.emit('requestInitialPlacements');

    socket.on('initialPlacements', (serverPlacements) => {
      setPlacements(serverPlacements);
    });

    socket.on('placeEmoji', (data) => {
      setPlacements(prev => [...prev, data]);
    });

    return () => {
      socket.off('initialPlacements');
      socket.off('placeEmoji');
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1200;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      placements.forEach((placement) => {
        if (placement.emoji) {
          const img = new Image();
          img.src = `/icons/${placement.emoji}`;
          img.onerror = () => {
            console.error(`Failed to load image: ${placement.emoji}`);
            img.src = `/icons/Bat.png`;
          };
          img.onload = () => {
            ctx.drawImage(img, placement.x, placement.y, 50, 50);
          };
        }
      });

      if (isPlacing && currentWord) {
        const matched = findMatchingLabel(currentWord);
        const imageToShow = matched ? matched.emoji : null;
        if (imageToShow) {
          const img = new Image();
          img.src = `/icons/${imageToShow}`;
          img.onload = () => {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(img, mousePosition.x - 25, mousePosition.y - 25, 50, 50);
            ctx.globalAlpha = 1.0;
          };
        } else {
          ctx.font = '24px Arial';
          ctx.fillText(currentWord, mousePosition.x, mousePosition.y);
        }
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [placements, isPlacing, currentWord, mousePosition]);

  const findMatchingLabel = (inputWord) => {
    const lowered = inputWord.toLowerCase();
    for (const key in labelMap) {
      if (labelMap[key].synonyms.map(s => s.toLowerCase()).includes(lowered)) {
        return labelMap[key];
      }
    }
    return null;
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseClick = (e) => {
    if (isPlacing && currentWord) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const matched = findMatchingLabel(currentWord);

      const newPlacement = {
        word: currentWord,
        emoji: matched ? matched.emoji : '',
        x,
        y,
        userId: currentUser
      };

      socket.emit('placeEmoji', newPlacement);
      setIsPlacing(false);
      setCurrentWord('');
    }
  };

  const handleConfirmWord = () => {
    if (currentWord.trim() !== '') {
      setIsPlacing(true);
    }
  };

  return (
    <div>
      <h2>Welcome, {currentUser}</h2>
      <input
        type="text"
        placeholder="Type a word..."
        value={currentWord}
        onChange={(e) => setCurrentWord(e.target.value)}
      />
      <button onClick={handleConfirmWord}>Confirm</button>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        style={{ border: '1px solid black', marginTop: '10px' }}
      />
    </div>
  );
};

export default Canvas;
