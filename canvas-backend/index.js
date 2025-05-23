/* ---------- unchanged imports / app / io setup --------- */
const express = require('express');
const http = require('http');
const cors = require('cors');
const {
  Server
} = require('socket.io');
const mongoose = require('mongoose');

/* === NEW – helpers for the auto-rules === */
const autoRules = require('./autoRules'); // array of rule objects
const labelMap = require('./labelMap.json'); // emoji → category lookup
/* ---------------------------------------- */

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://canvas-frontend.onrender.com'],
    methods: ['GET', 'POST'],
  },
});

/* ---------- Mongo ------------ */
mongoose.connect(
  'mongodb+srv://constein98:goingtofish@clusterc1804.zawuirl.mongodb.net/?retryWrites=true&w=majority&appName=ClusterC1804',
);

const placementSchema = new mongoose.Schema({
  word: String,
  emoji: String,
  x: Number,
  y: Number,
  userId: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  deleted: {
    type: Boolean,
    default: false
  },
  category: String, // NEW: Add category field to schema
});
const Placement = mongoose.model('Placement', placementSchema);

const querySchema = new mongoose.Schema({
  target: {
    type: String,
    default: 'all'
  },
  question: String,
  answered: {
    type: Boolean,
    default: false
  },
  answer: String,
  askedAt: {
    type: Date,
    default: Date.now
  },
  answeredAt: Date,
  isAuto: {
    type: Boolean,
    default: false
  },
  ruleId: String,
  queryUserId: String,
});
const Query = mongoose.model('Query', querySchema);

/* ═════════════  SOCKET LOGIC  ════════════ */
io.on('connection', (socket) => {
  console.log('connected', socket.id);

  // send only *live* icons
  Placement.find({
    deleted: false
  }).then(docs =>
    socket.emit('initialPlacements', docs)
  );

  /* save first – then broadcast the *saved* doc */
  socket.on('placeEmoji', async (raw) => {
    // Determine the category *before* saving
    let category = 'Unknown';
    for (const key in labelMap) {
      if (labelMap[key].emoji === raw.emoji) {
        category = labelMap[key].category;
        break;
      }
    }

    const doc = await new Placement({
      ...raw,
      category
    }).save(); // Save with category
    io.emit('placeEmoji', doc);

    /* ── NEW: evaluate automatic rules for this user ── */
    try {
      await runAutoRules(doc.userId, doc);
    } catch (error) {
      console.error('Error running auto rules:', error);
    }
  });

  socket.on('requestInitialPlacements', async () => {
    const docs = await Placement.find({
      deleted: false
    });
    socket.emit('initialPlacements', docs);
  });

  /* deletePlacement unchanged */
  socket.on('deletePlacement', async ({
    userId,
    x,
    y
  }) => {
    const R = 30;
    const cand = await Placement.find({
      userId,
      deleted: false,
      x: {
        $gte: x - R,
        $lte: x + R
      },
      y: {
        $gte: y - R,
        $lte: y + R
      },
    }).lean();

    if (!cand.length) return;
    const nearest = cand.reduce((a, b) => {
      const da = (a.x - x) ** 2 + (a.y - y) ** 2;
      const db = (b.x - x) ** 2 + (b.y - y) ** 2;
      return da < db ? a : b;
    });

    await Placement.updateOne({
      _id: nearest._id
    }, {
      $set: {
        deleted: true
      }
    });
    io.emit('markDeleted', String(nearest._id));
  });

  /* ---------------- dashboard ↔ query list ---------------- */
  socket.on('requestAllQueries', async () => {
    const qs = await Query.find().sort({
      askedAt: -1
    });
    socket.emit('allQueries', qs);
  });

  socket.on('createQuery', async ({
    target = 'all',
    question
  }) => {
    if (!question) return;
    const doc = await new Query({
      target,
      question
    }).save();
    io.emit('newQuery', doc);
  });

  socket.on('answerQuery', async ({
    id,
    answer,
    declined
  }) => {
    const q = await Query.findByIdAndUpdate(
      id, {
        answered: true,
        answer: declined ? 'Declined to answer' : answer,
        answeredAt: new Date()
      }, {
        new: true
      }
    );
    if (q) io.emit('queryAnswered', q);
  });
});

/* ═════════════  AUTO-RULE ENGINE  ════════════ */

/* helper: find category for an emoji filename */
function labelForEmoji(emoji) {
  if (!emoji) return null;
  const entry = Object.values(labelMap).find(e => e.emoji === emoji);
  return entry ? entry.category : null;
}

/* run every rule for the given user */
async function runAutoRules(userId, lastPlacement) {
  try {
    console.log(`[autoRules] Running rules for userId: ${userId}`);
    /* 1️⃣  aggregate per-word counts -------------------------------- */
    const wordCounts = await Placement.aggregate([{
        $match: {
          userId,
          deleted: false
        }
      },
      {
        $group: {
          _id: '$word',
          count: {
            $sum: 1
          },
          emoji: {
            $first: '$emoji'
          }
        }
      },
      {
        $project: {
          _id: 0,
          word: '$_id',
          count: 1
        }
      }
    ]).then(res =>
      res.reduce((acc, cur) => {
        acc[cur.word] = cur.count;
        return acc;
      }, {})
    );
    console.log(`[autoRules] wordCounts:`, wordCounts);

    /* 2️⃣  aggregate per-category counts -------------------------------- */
    const categoryCounts = await Placement.aggregate([{
        $match: {
          userId,
          deleted: false
        }
      },
      {
        $group: {
          _id: '$category', // Access the pre-saved category
          count: {
            $sum: 1
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1
        }
      }
    ]).then(res =>
      res.reduce((acc, cur) => {
        acc[cur.category] = cur.count;
        return acc;
      }, {})
    );
    console.log(`[autoRules] categoryCounts:`, categoryCounts);

    /* 3️⃣  calculate total placements -------------------------------- */
    const total = await Placement.countDocuments({
      userId,
      deleted: false
    });
    console.log(`[autoRules] total:`, total);

    /* 4️⃣  evaluate every rule --------------------------------------- */
    for (const rule of autoRules) {
      let shouldFire = false;
      let params = {}; // Initialize params here

      // Check if the rule has already been triggered for this user
      const existingQuery = await Query.findOne({
        ruleId: rule.id,
        queryUserId: userId,
      });

      if (!existingQuery) {
        // Prepare parameters for the rule's test
        params = {
          lastPlacement,
          wordCounts,
          categoryCounts,
          total,
          // heatmapDensity: 0, // Placeholder - you'll need to calculate this
        };

        if (rule.id === 'hotspot-activity') {
          // Calculate heatmapDensity here (example - replace with your logic)
          params.heatmapDensity = await getHeatmapDensity(userId);
        }
        console.log(`[autoRules] Testing rule: ${rule.id} with params:`, params);
        shouldFire = !!rule.test(params);
      }

      if (shouldFire) {
        let questionText = rule.question; // Start with the base question
        if (rule.dynamic) {
          const ruleParams = rule.test(params); // Get the specific params for this rule
          if (ruleParams) {
            if (rule.id === 'repeat-object-10' && ruleParams.word) {
              questionText += `'${ruleParams.word}'. What are you making?`;
            } else if (rule.id === 'dominant-category' && ruleParams.category) {
              questionText += `'${ruleParams.category}'. What is your plan?`;
            }
          }
        }

        console.log(`[autoRules] Firing rule: ${rule.id} for userId: ${userId}`);
        const qDoc = await new Query({
          target: userId,
          question: questionText, // Use the constructed question
          isAuto: true,
          ruleId: rule.id,
          queryUserId: userId, // Store the userId
        }).save();

        io.emit('newQuery', qDoc); // push to user & dashboard
      }
    }
  } catch (error) {
    console.error('Error in runAutoRules:', error);
  }
}

async function getHeatmapDensity(userId) {
  try {
    const heatmapData = await Placement.aggregate([
      {
        $match: {
          userId: userId,
          deleted: false
        }
      },
      {
        $project: {
          cellX: {
            $floor: {
              $divide: ['$x', 40]
            }
          },
          cellY: {
            $floor: {
              $divide: ['$y', 40]
            }
          },
          _id: 0,
          x: '$x',
          y: '$y'
        }
      },
      {
        $group: {
          _id: {
            x: '$cellX',
            y: '$cellY'
          },
          count: {
            $sum: 1
          },
          points: {
            $push: {
              x: '$x',
              y: '$y'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          x: '$_id.x',
          y: '$_id.y',
          density: '$count'
        }
      }
    ]);
    // Calculate a combined density (example: average density)
    let totalDensity = 0;
    heatmapData.forEach(cell => {
      totalDensity += cell.density;
    });
    const averageDensity = heatmapData.length > 0 ? totalDensity / heatmapData.length : 0;
    console.log(`[getHeatmapDensity] averageDensity:`, averageDensity);
    return averageDensity;
  } catch (error) {
    console.error('Error in getHeatmapDensity:', error);
    return 0; // Return a default value in case of error
  }
}
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
    const facet = await Placement.aggregate([{
        $match: {
          timestamp: {
            $gte: past7
          }
        }
      },
      {
        $facet: {
          donut: [{
            $group: {
              _id: '$emoji',
              count: {
                $sum: 1
              }
            }
          }],
          perDay: [{
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$timestamp'
                  }
                },
                count: {
                  $sum: 1
                }
              }
            },
            {
              $sort: {
                _id: 1
              }
            }
          ],
          last: [{
              $sort: {
                timestamp: -1
              }
            },
            {
              $limit: 30
            }
          ]
        }
      }
    ]);

    res.json(facet[0]);
  } catch (err) {
    console.error('GET /dashboard-data failed', err);
    res.status(500).json({
      error: err.message
    });
  }
});

// GET /api/pending-query?uid=P3
app.get('/api/pending-query', async (req, res) => {
  const uid = req.query.uid;
  const doc = await mongoose.connection
    .collection('queries')
    .findOne({
      target: {
        $in: [uid, 'all']
      },
      answered: false
    }, {
      sort: {
        askedAtAt: -1
      }
    });
  res.json(doc || {}); // {} if nothing pending
});

/* POST /api/query   body = { target:"P3"|"all", question:"…" } */
app.use(express.json());
app.post('/api/query', async (req, res) => {
  const {
    target,
    question
  } = req.body;
  if (!question) return res.status(400).json({
    error: 'question missing'
  });

  //const doc = { target: target || 'all', question, askedAt: new Date() };
  //const col = mongoose.connection.collection('queries');
  //await col.insertOne(doc);
  const doc = await new Query({
    target: target || 'all',
    question
  }).save();

  io.emit('newQuery', doc); // push to everyone; client filters
  //res.json({ ok: true });
  res.json(doc);
});
app.get('/api/queries', async (_req, res) =>
  res.json(await Query.find().sort({
    askedAt: -1
  }))
);

/* ---------- dashboard data endpoint ---------- */
app.get('/dashboard-data', async (req, res) => {
  try {
    const placements = await Placement.find().lean();
    res.json(placements); // plain JSON array
  } catch (err) {
    console.error('GET /dashboard-data failed', err);
    res.status(500).json({
      error: err.message
    });
  }
});

/* 3) GET  /api/heatmap   or  /api/heatmap?uid=P3   */
app.get('/api/heatmap', async (req, res) => {
  try {
    const specificUserId = req.query.uid;
    const BUCKET_SIZE = 40; // Define bucket size for cell calculation

    let aggregationPipeline = [];

    if (specificUserId && specificUserId !== 'All') {
      // AGGREGATION FOR A SPECIFIC USER
      aggregationPipeline = [
        { 
          $match: { 
            deleted: false, 
            userId: specificUserId // Filter by the specific user
          } 
        },
        {
          $project: { // Determine cell coordinates for each placement
            cellX: { $floor: { $divide: ['$x', BUCKET_SIZE] } },
            cellY: { $floor: { $divide: ['$y', BUCKET_SIZE] } },
            userId: '$userId', 
            // _id: 0 // No longer excluding _id here, group stage will handle it
          }
        },
        {
          $group: { // Group by cell for the filtered user
            _id: { x: '$cellX', y: '$cellY' },
            userN: { $sum: 1 }, // Count of activities for this user in this cell
            uid: { $first: '$userId' } // The uid is constant due to the $match stage
          }
        },
        {
          $project: { // Structure the output consistently
            _id: 0,
            x: '$_id.x',
            y: '$_id.y',
            activities: [{ uid: '$uid', n: '$userN' }], // Array with one user's activity
            totalN: '$userN' // For a single user, totalN in cell is their own N
          }
        }
      ];
    } else {
      // AGGREGATION FOR "ALL" USERS
      aggregationPipeline = [
        { 
          $match: { deleted: false } // Get all non-deleted placements
        },
        {
          $project: { // Determine cell coordinates and user ID for each placement
            cellX: { $floor: { $divide: ['$x', BUCKET_SIZE] } },
            cellY: { $floor: { $divide: ['$y', BUCKET_SIZE] } },
            userId: '$userId',
          }
        },
        {
          $group: { // Group by cell AND user to count activities per user per cell
            _id: { x: '$cellX', y: '$cellY', uid: '$userId' },
            userN_count: { $sum: 1 } // Total activities for this specific user in this cell
          }
        },
        {
          $group: { // Group again by cell to collect all users and their activities
            _id: { x: '$_id.x', y: '$_id.y' }, // Group only by cell coordinates
            activitiesInCell: { 
              $push: { uid: '$_id.uid', n: '$userN_count' } // Create array of {uid, n}
            },
            totalNInCell: { $sum: '$userN_count' } // Sum of all activities from all users in this cell
          }
        },
        {
          $project: { // Final structure for each cell
            _id: 0,
            x: '$_id.x',
            y: '$_id.y',
            activities: '$activitiesInCell', 
            totalN: '$totalNInCell'
          }
        }
      ];
    }

    const cells = await Placement.aggregate(aggregationPipeline);
    // console.log(`[API /heatmap] Filter: ${specificUserId || 'All'}, Cells found: ${cells.length}`);
    // cells.forEach(cell => {
    //   if (cell.totalN === 0) console.warn("[API /heatmap] Cell with totalN=0:", cell);
    //   cell.activities.forEach(act => {
    //     if (act.n === 0) console.warn("[API /heatmap] Activity with n=0:", act, "in cell:", cell.x, cell.y);
    //   });
    // });
    res.json(cells);

  } catch (e) {
    console.error('GET /api/heatmap failed:', e);
    res.status(500).json({ error: e.message, details: e.stack });
  }
});

/* --------- the rest of your routes stay unchanged -------- */
server.listen(process.env.PORT || 5000, () =>
  console.log('API listening'),
);