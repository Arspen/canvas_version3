import React, { useState } from 'react';
import Canvas from './Canvas';
import UserIdDialog from './components/UserIdDialog';

export default function App() {
  const [userId, setUserId] = useState(
    localStorage.getItem('uid') || null,
  );

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

  return <Canvas userId={userId} />;
}
/*
function App() {
  // temporary anonymous userId
  const userId = localStorage.getItem('uid') ??
    (() => {
      const id = crypto.randomUUID();
      localStorage.setItem('uid', id);
      return id;
    })();

  return <Canvas userId={userId} />;
}
export default App;
*/