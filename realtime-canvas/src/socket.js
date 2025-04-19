import { io } from 'socket.io-client';

// Backend URL (we'll set it up later)
const socket = io('http://localhost:5000');

export default socket;
