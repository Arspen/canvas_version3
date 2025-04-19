const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://canvas-frontend.onrender.com'],
    methods: ['GET', 'POST']
  }
});

// MongoDB connection
mongoose.connect('mongodb+srv://constein98:goingtofish@clusterc1804.zawuirl.mongodb.net/?retryWrites=true&w=majority&appName=ClusterC1804');

// Schema
const placementSchema = new mongoose.Schema({
  word: String,
  emoji: String,
  x: Number,
  y: Number,
  userId: String,
  timestamp: { type: Date, default: Date.now }
});

const Placement = mongoose.model('Placement', placementSchema);

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // Initial placements to new user
  Placement.find().then(placements => {
    socket.emit('initialPlacements', placements);
  });

  // Handle new placements
  socket.on('placeEmoji', async (data) => {
    const placement = new Placement(data);
    await placement.save();
    io.emit('placeEmoji', data);
  });

  socket.on('requestInitialPlacements', async () => {
    const placements = await Placement.find();
    socket.emit('initialPlacements', placements);
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
