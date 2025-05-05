import React, { useState } from 'react';
import Canvas      from './Canvas';
import UserIdDialog from './components/UserIdDialog';
import IntroOverlay from './components/IntroOverlay';
import GhostIcon    from './components/GhostIcon';        // ← new

export default function App() {
  const [userId, setUserId]  = useState(localStorage.getItem('uid') || null);
  const [showIntro, setIntro]= useState(true);

  if (!userId) {
    return (
      <UserIdDialog
        onDone={(id) => {
          localStorage.setItem('uid', id);
          setUserId(id);
        }}
      />
    );
  }

  return (
    <>
      <GhostIcon />                                    {/* always there */}
      {showIntro && <IntroOverlay onDone={() => setIntro(false)} />}

      <Canvas userId={userId} />
    </>
  );
}
