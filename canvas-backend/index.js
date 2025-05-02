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

/* ---------- DASHBOARD ROUTES ---------- */

// GET /api/dashboard-data  (called every ~5 s by dashboard)
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const today = new Date();
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 6);

    // big aggregation in one go
    const facet = await Placement.aggregate([
      { $match: { timestamp: { $gte: past7 } } },
      {
        $facet: {
          donut: [
            { $group: { _id: '$emoji', count: { $sum: 1 } } }
          ],
          perDay: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          last: [
            { $sort: { timestamp: -1 } },
            { $limit: 30 }
          ]
        }
      }
    ]);

    res.json(facet[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'aggregation failed' });
  }
});

/*  POST /api/query   body = { target:"P3"|"all", question:"…" } */
app.use(express.json());
app.post('/api/query', async (req, res) => {
  const { target, question } = req.body;
  if (!question) return res.status(400).json({ error: 'question missing' });

  const doc = { target: target || 'all', question, createdAt: new Date() };
  const col = mongoose.connection.collection('queries');
  await col.insertOne(doc);

  io.emit('newQuery', doc);          // push to everyone; client filters
  res.json({ ok: true });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
