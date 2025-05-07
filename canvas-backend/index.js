/* ---------- unchanged imports / app / io setup --------- */
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin : ['http://localhost:3000', 'https://canvas-frontend.onrender.com'],
    methods: ['GET', 'POST'],
  },
});

/* ---------- Mongo ------------ */
mongoose.connect(
  'mongodb+srv://constein98:goingtofish@clusterc1804.zawuirl.mongodb.net/?retryWrites=true&w=majority&appName=ClusterC1804',
);

const placementSchema = new mongoose.Schema({
  word  : String,
  emoji : String,
  x     : Number,
  y     : Number,
  userId: String,
  timestamp: { type: Date, default: Date.now },
  deleted  : { type: Boolean, default: false },
});
const Placement = mongoose.model('Placement', placementSchema);

/* ---------- socket logic ------ */
io.on('connection', (socket) => {
  console.log('connected', socket.id);

  // send only *live* icons
  Placement.find({ deleted: false }).then(docs =>
    socket.emit('initialPlacements', docs)
  );

  /* ◆ save first – then broadcast the *saved* doc so it already
        contains the Mongo _id field                                       */
  socket.on('placeEmoji', async (raw) => {
    const doc = await new Placement(raw).save();
    io.emit('placeEmoji', doc);                    // <-- with _id
  });

  socket.on('requestInitialPlacements', async () => {
    const docs = await Placement.find({ deleted: false });
    socket.emit('initialPlacements', docs);
  });

  /* deletePlacement stays logically the same, just emits _id */
  socket.on('deletePlacement', async ({ userId, x, y }) => {
    const R = 30;
    const cand = await Placement.find({
      userId, deleted: false,
      x: { $gte: x - R, $lte: x + R },
      y: { $gte: y - R, $lte: y + R },
    }).lean();

    if (!cand.length) return;
    const nearest = cand.reduce((a, b) => {
      const da = (a.x - x) ** 2 + (a.y - y) ** 2;
      const db = (b.x - x) ** 2 + (b.y - y) ** 2;
      return da < db ? a : b;
    });

    await Placement.updateOne({ _id: nearest._id }, { $set: { deleted: true } });
    io.emit('markDeleted', String(nearest._id));   // always string
  });
});



/* --------- the rest of your routes stay unchanged -------- */
server.listen(process.env.PORT || 5000, () =>
  console.log('API listening'),
);
