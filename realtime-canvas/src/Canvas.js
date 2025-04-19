import React, { useRef, useEffect, useState } from 'react';
import socket from './socket';
import { getEmojiForWord } from './labelMapper';

const Canvas = ({ userId }) => {
  const canvasRef = useRef(null);
  const [currentWord, setCurrentWord] = useState("");
  const [pendingWord, setPendingWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = 2000;
    canvas.height = 1500;

    const drawAll = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      placements.forEach(({ emoji, word, x, y }) => {
        const content = emoji || word;
        context.font = "32px Arial";
        context.globalAlpha = 1;
        context.fillText(content, x, y);
      });

      if (pendingWord) {
        const hoverEmoji = getEmojiForWord(pendingWord);
        const display = hoverEmoji || pendingWord;
        context.font = "32px Arial";
        context.globalAlpha = 0.5;
        context.fillText(display, mousePos.x, mousePos.y);
        context.globalAlpha = 1;
      }
    };

    drawAll();

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

    const interval = setInterval(drawAll, 30);
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
