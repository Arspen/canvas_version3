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

const querySchema = new mongoose.Schema({
  target   : { type:String, default:'all' },   // 'P3' … or 'all'
  question : String,
  answered : { type:Boolean, default:false },
  answer   : String,
  askedAt  : { type:Date, default:Date.now },
  answeredAt: Date,
});
const Query = mongoose.model('Query', querySchema);

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

 /* --- dashboard asks once for *all* queries --------------------------- */
 socket.on('requestAllQueries', async () => {
  const qs = await Query.find().sort({ askedAt:-1 });
  socket.emit('allQueries', qs);
});

/* --- dashboard (or auto-rule) creates a question -------------------- */
socket.on('createQuery', async ({ target='all', question }) => {
  if(!question) return;
  const doc = await new Query({ target, question }).save();
  io.emit('newQuery', doc);                 // broadcast
});

/* --- user answers (or declines) ------------------------------------- */
socket.on('answerQuery', async ({ id, answer, declined }) => {
  const q = await Query.findByIdAndUpdate(
    id,
    { answered:true,
      answer   : declined ? 'Declined to answer' : answer,
      answeredAt:new Date() },
    { new:true }
  );
  if(q) io.emit('queryAnswered', q);        // dashboard update
});

});
/* =================================================================== */
/* =======================  DASHBOARD ROUTES  ======================== */
/* =================================================================== */

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

// GET /api/pending-query?uid=P3
app.get('/api/pending-query', async (req,res)=>{
  const uid = req.query.uid;
  const doc = await mongoose.connection
               .collection('queries')
               .findOne({ target: { $in: [uid,'all'] }, answered:false },
                        { sort:{ askedAtAt:-1 } });
  res.json(doc || {});          // {} if nothing pending
});



/*  POST /api/query   body = { target:"P3"|"all", question:"…" } */
app.use(express.json());
app.post('/api/query', async (req, res) => {
  const { target, question } = req.body;
  if (!question) return res.status(400).json({ error: 'question missing' });

  //const doc = { target: target || 'all', question, askedAt: new Date() };
  //const col = mongoose.connection.collection('queries');
  //await col.insertOne(doc);
  const doc = await new Query({ target: target || 'all', question }).save();
  
  io.emit('newQuery', doc);          // push to everyone; client filters
  res.json({ ok: true });
});
app.get('/api/queries', async (_req,res)=>
  res.json(await Query.find().sort({ askedAt:-1 })));

/* ---------- dashboard data endpoint ---------- */
app.get('/dashboard-data', async (req, res) => {
  try {
    const placements = await Placement.find().lean();
    res.json(placements);              // plain JSON array
  } catch (err) {
    console.error('GET /dashboard-data failed', err);
    res.status(500).json({ error: err.message });
  }
});

/* 3) GET  /api/heatmap   or  /api/heatmap?uid=P3   */
app.get('/api/heatmap', async (req, res) => {
  try{
    const match = { deleted:false };
    if(req.query.uid && req.query.uid!=='All') match.userId = req.query.uid;

    const cells = await Placement.aggregate([
      { $match: match },
      {
        $project:{
          cellX:{ $floor:{ $divide:['$x',40] }},
          cellY:{ $floor:{ $divide:['$y',40] }},
          uid  :'$userId'
        }
      },
      { $group: { _id:{ x:'$cellX', y:'$cellY', uid:'$userId' }, n:{ $sum:1 } } }
    ]);
    res.json(cells);
  }catch(e){
    console.error(e); res.status(500).json({ error:e.message });
  }
});


/* --------- the rest of your routes stay unchanged -------- */
server.listen(process.env.PORT || 5000, () =>
  console.log('API listening'),
);
