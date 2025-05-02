import { useState } from 'react';
import './userIdModal.css';           // next section

export default function UserIdModal({ onSubmit }) {
  const [id, setId] = useState('');

  const handle = (e) => {
    e.preventDefault();
    if (id.trim()) onSubmit(id.trim());
  };

  return (
    <div className="uid-backdrop">
      <form className="uid-card" onSubmit={handle}>
        {/* Shadow icon top-left */}
        <img src="/icons/Shadow.png" alt="" className="shadow-mark" />
        <h2>Enter your&nbsp;user ID</h2>

        <input
          type="text"
          placeholder="e.g. P1"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />

        <button type="submit">Continue</button>
      </form>
    </div>
  );
}

/*
import React, { useState } from 'react';

const dialogStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
};

const box = {
  background: '#fff',
  padding: 24,
  borderRadius: 8,
  width: 300,
  textAlign: 'center',
};

const UserIdDialog = ({ onDone }) => {
  const [name, setName] = useState('');

  return (
    <div style={dialogStyle}>
      <div style={box}>
        <h2>Enter your user ID</h2>
        <input
          style={{ width: '90%', padding: 8, fontSize: 16 }}
          value={name}
          placeholder="e.g. alice42"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name && onDone(name)}
        />
        <button
          style={{ marginTop: 16, padding: '8px 16px' }}
          onClick={() => name && onDone(name)}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default UserIdDialog;
*/