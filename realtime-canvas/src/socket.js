import { io } from 'socket.io-client';


// Backend URL (we'll set it up later)
const socket = io('https://canvas-version3.onrender.com');

export default socket;
