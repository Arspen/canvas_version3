import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import labelMap from "./labelMap.json";

const backendURL = "https://canvas-version3.onrender.com"; // CHANGE THIS to your actual backend URL!
const socket = io(backendURL);

const Canvas = () => {
  const canvasRef = useRef(null);
  const [placements, setPlacements] = useState([]);
  const [word, setWord] = useState("");
  const [userId, setUserId] = useState("");
  const [hoveringIcon, setHoveringIcon] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const imageCache = useRef({});

  useEffect(() => {
    const id = prompt("Enter your user ID:") || `user-${Date.now()}`;
    setUserId(id);

    socket.on("initialPlacements", (initialPlacements) => {
      setPlacements(initialPlacements);
    });

    socket.on("placeEmoji", (placement) => {
      setPlacements((prev) => [...prev, placement]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      placements.forEach((placement) => {
        const { x, y, emoji } = placement;
        if (emoji.endsWith(".png")) {
          const img = imageCache.current[emoji];
          if (img) {
            ctx.drawImage(img, x - 16, y - 16, 32, 32);
          }
        }
      });

      if (hoveringIcon) {
        const img = imageCache.current[hoveringIcon];
        if (img) {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(img, hoverPos.x - 16, hoverPos.y - 16, 32, 32);
          ctx.globalAlpha = 1.0;
        }
      }

      requestAnimationFrame(render);
    };

    render();
  }, [placements, hoveringIcon, hoverPos]);

  const handleMouseMove = (e) => {
    if (!hoveringIcon) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleCanvasClick = (e) => {
    if (!hoveringIcon) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const placement = {
      word,
      emoji: hoveringIcon,
      x,
      y,
      userId,
    };

    socket.emit("placeEmoji", placement);
    setPlacements((prev) => [...prev, placement]);
    setHoveringIcon(null);
    setWord("");
  };

  const handleConfirm = () => {
    if (!word.trim()) return;

    let found = null;
    for (const label in labelMap) {
      if (labelMap[label].synonyms.map((s) => s.toLowerCase()).includes(word.toLowerCase())) {
        found = labelMap[label].emoji;
        break;
      }
    }

    if (found) {
      setHoveringIcon(found);

      if (!imageCache.current[found]) {
        const img = new Image();
        img.src = `/icons/${found}`;
        img.onload = () => {
          imageCache.current[found] = img;
        };
        img.onerror = () => {
          console.error(`Failed to load image: ${found}`);
        };
      }
    } else {
      alert("No matching icon found. Try another word.");
    }
  };

  return (
    <div>
      <h1>Welcome, {userId}</h1>
      <input
        type="text"
        placeholder="Enter a word"
        value={word}
        onChange={(e) => setWord(e.target.value)}
      />
      <button onClick={handleConfirm}>Confirm</button>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
        style={{ border: "1px solid black", marginTop: "10px" }}
      />
    </div>
  );
};

export default Canvas;
