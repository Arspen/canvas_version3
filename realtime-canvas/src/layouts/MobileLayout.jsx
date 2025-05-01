import React, { useState } from 'react';

const sheetStyle = (open) => ({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: open ? 0 : '-80vh',
  height: '80vh',
  background: '#fff',
  transition: 'bottom 0.25s',
  borderTop: '2px solid #444',
  zIndex: 40,
  overflowY: 'auto',
  padding: 16,
});

const MobileLayout = ({
  currentWord,
  setCurrentWord,
  handleWordSubmit,
  canvasRef,
  containerRef,
  handlePointer,
  handlePlaceClick,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* floating plus button */}
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          width: 56,
          height: 56,
          borderRadius: '50%',
          fontSize: 32,
          zIndex: 50,
        }}
      >
        ＋
      </button>

      {/* slide-up sheet */}
      <div style={sheetStyle(sheetOpen)}>
        <h3>Add a word</h3>
        <form
          onSubmit={(e) => {
            handleWordSubmit(e);
            setSheetOpen(false);
          }}
        >
          <input
            type="text"
            value={currentWord}
            onChange={(e) => setCurrentWord(e.target.value)}
            placeholder="Type…"
            style={{
              padding: 10,
              fontSize: 18,
              width: '90%',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            style={{ marginTop: 12, padding: 10, width: '90%' }}
          >
            Place
          </button>
        </form>
        <button
          style={{ marginTop: 8, padding: 10, width: '90%' }}
          onClick={() => setSheetOpen(false)}
        >
          Cancel
        </button>
      </div>

      {/* centred target marker */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 32,
          height: 32,
          border: '2px solid #f00',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      />



      {/* full-viewport scrollable canvas */}
      <div
        ref={containerRef}
        style={{ height: '100vh', overflow: 'scroll', background: '#fff' }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointer}
          onPointerDown={handlePlaceClick}
        />
      </div>
    </>
  );
};

export default MobileLayout;
