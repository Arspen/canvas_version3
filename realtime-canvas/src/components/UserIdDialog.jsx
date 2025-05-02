import React, { useState } from 'react';
import './userIdModal.css';        // keep your CSS import if you have one

const dialogStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
};

const boxStyle = {
  position: 'relative',        // ⬅️ allow absolute-positioned children
  background: '#fff',
  padding: 40,
  borderRadius: 12,
  width: 340,
  textAlign: 'center',
  boxShadow: '0 12px 22px rgba(0,0,0,0.15)',
};

export default function UserIdDialog({ onDone }) {
  const [name, setName] = useState('');

  return (
    <div style={dialogStyle}>
      <div style={boxStyle}>
        {/*  shadow sticker  */}
        <img
          src="/icons/Shadow.png"
          alt=""
          style={{
            position: 'absolute',
            left: -84,
            top: -104,
            width: 200,          // ≈ 3× the previous ~24 px icon
            height: 200,
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />

        <h2 style={{ marginTop: 0 }}>Enter your user ID</h2>

        <input
          style={{
            width: '90%',
            padding: 12,
            fontSize: 18,
            borderRadius: 8,
            border: '1px solid #ccc',
          }}
          value={name}
          placeholder="e.g. P1"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name && onDone(name)}
        />

        <button
          style={{
            marginTop: 24,
            padding: '10px 24px',
            fontSize: 16,
            background: '#0d1117',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
          onClick={() => name && onDone(name)}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
