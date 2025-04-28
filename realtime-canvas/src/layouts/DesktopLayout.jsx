import React from 'react';

const DesktopLayout = ({
  currentWord,
  setCurrentWord,
  handleWordSubmit,
  canvasRef,
  handlePointer,
  handlePlaceClick,
}) => (
  <div>
    <form onSubmit={handleWordSubmit} style={{ marginBottom: 10 }}>
      <input
        type="text"
        value={currentWord}
        onChange={(e) => setCurrentWord(e.target.value)}
        placeholder="Type a word…"
        style={{ padding: 8, fontSize: 16 }}
      />
      <button type="submit" style={{ marginLeft: 10, padding: 8 }}>
        Confirm
      </button>
    </form>

    <div
      style={{
        overflow: 'scroll',
        border: '1px solid #000',
        height: '80vh',
        width: '80vw',
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointer}
        onPointerDown={handlePlaceClick}
        style={{ background: '#fff' }}
      />
    </div>
  </div>
);

export default DesktopLayout;
