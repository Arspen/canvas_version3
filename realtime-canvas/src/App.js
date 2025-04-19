
import React, { useEffect, useState } from 'react';
import Canvas from './Canvas';

function App() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let uid = localStorage.getItem('userId');

    // Prompt for name if not stored already
    if (!uid) {
      uid = prompt("Enter your name or ID:");
      if (uid) {
        localStorage.setItem('userId', uid);
        setUserId(uid);
      }
    } else {
      setUserId(uid);
    }
  }, []);

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <h1>Welcome, {userId}</h1>
      <Canvas userId={userId} />
    </div>
  );
}

export default App;