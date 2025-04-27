import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import labelMap from "./labelMap.json";

const backendUrl = "https://canvas-version3.onrender.com"; // <== your backend URL

const Canvas = () => {
  const canvasRef = useRef(null);
  const [placements, setPlacements] = useState([]);
  const [word, setWord] = useState("");
  const [userId, setUserId] = useState("");
  const [imageCache, setImageCache] = useState({});
  const [hoveredImage, setHoveredImage] = useState(null);

  useEffect(() => {
    const id = prompt("Enter your user ID:");
    setUserId(id || `user_${Math.floor(Math.random() * 1000)}`);
  }, []);

  useEffect(() => {
    const socket = io(backendUrl);

    socket.on("connect", () => {
      console.log("Connected to server");
      socket.emit("requestInitialPlacements");
    });

    socket.on("initialPlacements", (data) => {
      setPlacements(data);
    });

    socket.on("placeEmoji", (data) => {
      setPlacements((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");

    const draw = () => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      placements.forEach((placement) => {
        const img = imageCache[placement.emoji];
        if (img) {
          ctx.drawImage(img, placement.x, placement.y, 40, 40);
        }
      });

      if (hoveredImage) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(hoveredImage.img, hoveredImage.x, hoveredImage.y, 40, 40);
        ctx.globalAlpha = 1.0;
      }

      requestAnimationFrame(draw);
    };

    draw();
  }, [placements, hoveredImage, imageCache]);

  useEffect(() => {
    const cache = {};
    Object.values(labelMap).forEach((entry) => {
      if (entry.emoji && !cache[entry.emoji]) {
        const img = new Image();
        img.src = `/icons/${entry.emoji}`;
        cache[entry.emoji] = img;
      }
    });
    setImageCache(cache);
  }, []);

  const handleCanvasClick = (e) => {
    if (!hoveredImage) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const socket = io(backendUrl);
    socket.emit("placeEmoji", {
      word: hoveredImage.word,
      emoji: hoveredImage.emoji,
      x,
      y,
      userId,
    });
    socket.disconnect();

    setHoveredImage(null);
  };

  const handleConfirm = () => {
    if (!word.trim()) return;

    let selectedEmoji = null;
    for (const [label, { synonyms, emoji }] of Object.entries(labelMap)) {
      if (synonyms.map((s) => s.toLowerCase()).includes(word.toLowerCase())) {
        selectedEmoji = emoji;
        break;
      }
    }

    if (selectedEmoji && imageCache[selectedEmoji]) {
      setHoveredImage({
        word,
        emoji: selectedEmoji,
        img: imageCache[selectedEmoji],
      });
    } else {
      alert("Word not recognized!");
    }
  };

  const handleMouseMove = (e) => {
    if (!hoveredImage) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setHoveredImage((prev) => ({
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }));
  };

  return (
    <div>
      <h1>Welcome, {userId}</h1>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Type a word..."
      />
      <button onClick={handleConfirm}>Confirm</button>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        style={{ border: "1px solid black" }}
      />
    </div>
  );
};

export default Canvas;
