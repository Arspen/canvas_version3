import React, { useState } from 'react';
import Canvas from './Canvas';
import UserIdDialog from './components/UserIdDialog';
import IntroOverlay from './components/IntroOverlay';   // ← NEW

export default function App() {
  /** 1 – user id as before */
  const [userId, setUserId] = useState(
    localStorage.getItem('uid') || null,
  );

  /** 2 – “show intro once” flag */
  const [showIntro, setShowIntro] = useState(false);

  /** 3 – dialog still first */
  if (!userId) {
    return (
      <UserIdDialog
        onDone={(id) => {
          localStorage.setItem('uid', id);
          setUserId(id);
          setShowIntro(true);          // show the ghost
        }}
      />
    );
  }

  /** 4 – normal canvas plus optional overlay */
  return (
    <>
      {showIntro && (
        <IntroOverlay onDone={() => setShowIntro(false)} />
      )}

      <Canvas userId={userId} />
    </>
  );
}
