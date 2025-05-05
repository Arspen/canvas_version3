import React, { useState, useRef, useEffect } from 'react';

/* colours reused from the pills */
const BAR_BG = '#ffffffee';            // translucent white
const BORDER  = '#d1d5db';

export default function MobileLayout({
  currentWord,
  setCurrentWord,
  handleWordSubmit,
  canvasRef,
  containerRef,
  handlePointer,
  handlePlaceClick,
}) {
  /* ----- keep the centre target ring (unchanged) ----- */
  const target = (
<div
    style={{
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: 32,
      height: 32,
      pointerEvents: 'none',
      zIndex: 30,
      /* draw a plus: two centred bars */
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        position: 'absolute',
        width: 2,
        height: 24,
        background: '#000',
      }}
    />
    <div
      style={{
        position: 'absolute',
        width: 24,
        height: 2,
        background: '#000',
      }}
    />
  </div>
  );

  /* ----- make Enter key trigger send, too ----- */
  const onKey = (e) => {
    if (e.key === 'Enter' && currentWord.trim()) {
      handleWordSubmit(e);
    }
  };

  /* ----- autofocus when bar appears ----- */
  const inpRef = useRef(null);
  useEffect(() => {
    inpRef.current && inpRef.current.focus();
  }, []);

  /* ----- input/send bar anchored at bottom ----- */
  const inputBar = (
    <form
      onSubmit={handleWordSubmit}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 8,
        background: BAR_BG,
        backdropFilter: 'blur(6px)',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        gap: 8,
        zIndex: 40,
      }}
    >
      <input
        ref={inpRef}
        type="text"
        value={currentWord}
        onChange={(e) => setCurrentWord(e.target.value)}
        onKeyDown={onKey}
        placeholder="Type a word…"
        style={{
          flex: 1,
          padding: '10px 12px',
          fontSize: 16,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
        }}
      />

      {/* send icon button (- triangle) */}
      <button
        type="submit"
        style={{
          width: 52,
          height: 44,
          borderRadius: 8,
          border: 'none',
          background: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src="/icons/Send_Icon.png"
          alt="Send"
          style={{ width: 22, height: 22, filter: 'invert(1)' }}
        />
      </button>
      <button
  type="button"
  onClick={() => socket.emit('deletePlacement', {
    userId,
    // centre of viewport target
    x: containerRef.current.scrollLeft + window.innerWidth  /2,
    y: containerRef.current.scrollTop  + window.innerHeight /2,
  })}
  style={{
    position:'fixed', right:18, bottom:84,
    width:56,height:56,borderRadius:'50%',
    background:'#ff4444',color:'#fff',border:'none',
    display:'flex',alignItems:'center',justifyContent:'center',
  }}
>
  🗑
</button>
    </form>
  );

  /* ----- viewport scrollable canvas ----- */
  return (
    <>
      {target}
      {inputBar}

      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          /* 56 px bar + 8 px padding  = 64 px */
          bottom: 64,
          overflow: 'scroll',
          background: '#fff',
          zIndex: 20,           /* under the input bar (z-index 40) */
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointer}
          onPointerDown={handlePlaceClick}
        />
      </div>
    </>
  );
}
