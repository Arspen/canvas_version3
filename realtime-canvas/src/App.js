import React from 'react';
import Canvas from './Canvas';

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
