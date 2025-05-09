import { io } from 'socket.io-client';


export const BACKEND =
  process.env.REACT_APP_BACKEND_URL            // you can set this on Render
  || (window.location.hostname === 'localhost'
         ? 'http://localhost:5000'
         : 'https://canvas-version3.onrender.com');

// Backend URL (we'll set it up later)
const socket = io(BACKEND);

export default socket;
