const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database ────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));

app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// ─── DB Init ──────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitors (
      id               BIGSERIAL PRIMARY KEY,
      name             VARCHAR(120) NOT NULL,
      occ_student_id   VARCHAR(9)   UNIQUE,
      role             VARCHAR(20)  NOT NULL,
      first_seen       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      last_seen        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      quiz_completed   BOOLEAN      NOT NULL DEFAULT FALSE,
      quiz_best_score  INT          NOT NULL DEFAULT 0,
      quiz_best_at     TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS visits (
      id          BIGSERIAL   PRIMARY KEY,
      visitor_id  BIGINT      NOT NULL REFERENCES visitors(id),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Database tables ready.');
}

// ─── Helper: dashboard snapshot ───────────────────────────────────────────────
async function buildDashboardSnapshot() {
  const tz = 'America/Los_Angeles';

  const [
    { rows: [{ count: totalVisits }] },
    { rows: [{ count: totalVisitors }] },
    { rows: [{ count: totalGuests }] },
    { rows: [{ count: totalOccStudents }] },
    { rows: [{ count: totalPerfectQuizUsers }] },
    { rows: [{ count: todayVisits }] },
    { rows: [{ count: todayVisitors }] },
    { rows: [{ count: todayGuests }] },
    { rows: [{ count: todayOcc }] },
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM visits`),
    pool.query(`SELECT COUNT(*) FROM visitors`),
    pool.query(`SELECT COUNT(*) FROM visitors WHERE role = 'GUEST'`),
    pool.query(`SELECT COUNT(*) FROM visitors WHERE role = 'OCC_STUDENT'`),
    pool.query(`SELECT COUNT(*) FROM visitors WHERE quiz_best_score = 10`),
    pool.query(`SELECT COUNT(*) FROM visits WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE $1) AT TIME ZONE $1 AND created_at < (DATE_TRUNC('day', NOW() AT TIME ZONE $1) + INTERVAL '1 day') AT TIME ZONE $1`, [tz]),
    pool.query(`SELECT COUNT(DISTINCT visitor_id) AS count FROM visits WHERE created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE $1) AT TIME ZONE $1 AND created_at < (DATE_TRUNC('day', NOW() AT TIME ZONE $1) + INTERVAL '1 day') AT TIME ZONE $1`, [tz]),
    pool.query(`SELECT COUNT(DISTINCT v.id) AS count FROM visits vi JOIN visitors v ON v.id = vi.visitor_id WHERE vi.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE $1) AT TIME ZONE $1 AND vi.created_at < (DATE_TRUNC('day', NOW() AT TIME ZONE $1) + INTERVAL '1 day') AT TIME ZONE $1 AND v.role = 'GUEST'`, [tz]),
    pool.query(`SELECT COUNT(DISTINCT v.id) AS count FROM visits vi JOIN visitors v ON v.id = vi.visitor_id WHERE vi.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE $1) AT TIME ZONE $1 AND vi.created_at < (DATE_TRUNC('day', NOW() AT TIME ZONE $1) + INTERVAL '1 day') AT TIME ZONE $1 AND v.role = 'OCC_STUDENT'`, [tz]),
  ]);

  return {
    totalVisits: Number(totalVisits),
    totalVisitors: Number(totalVisitors),
    totalGuests: Number(totalGuests),
    totalOccStudents: Number(totalOccStudents),
    totalPerfectQuizUsers: Number(totalPerfectQuizUsers),
    todayVisits: Number(todayVisits),
    todayVisitors: Number(todayVisitors),
    todayGuests: Number(todayGuests),
    todayOccStudents: Number(todayOcc),
  };
}

// ─── Session guard middleware ─────────────────────────────────────────────────
function requireSession(req, res, next) {
  if (!req.session?.visitorId) {
    return res.status(401).json({ error: 'No visitor session' });
  }
  next();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET / → redirect to login or main
app.get('/', (req, res) => {
  if (req.session?.visitorId) {
    res.redirect('/main.html');
  } else {
    res.redirect('/login.html');
  }
});

// POST /visitor/register
app.post('/visitor/register', async (req, res) => {
  try {
    let name = (req.body.name || '').trim() || 'Unknown';
    let occId = (req.body.occStudentId || '').trim().toUpperCase();

    if (occId && !/^C\d{8}$/.test(occId)) {
      return res.status(400).json({ error: 'Invalid OCC student id format' });
    }

    const isStudent = !!occId;
    const role = isStudent ? 'OCC_STUDENT' : 'GUEST';

    let visitor;
    if (isStudent) {
      // Upsert by occ_student_id
      const { rows } = await pool.query(
        `INSERT INTO visitors (name, occ_student_id, role, first_seen, last_seen)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (occ_student_id) DO UPDATE
           SET name = EXCLUDED.name, role = EXCLUDED.role, last_seen = NOW()
         RETURNING *`,
        [name, occId, role]
      );
      visitor = rows[0];
    } else {
      // Guests: always new visitor row
      const { rows } = await pool.query(
        `INSERT INTO visitors (name, occ_student_id, role, first_seen, last_seen)
         VALUES ($1, NULL, $2, NOW(), NOW()) RETURNING *`,
        [name, role]
      );
      visitor = rows[0];
    }

    // Log a visit
    await pool.query(`INSERT INTO visits (visitor_id) VALUES ($1)`, [visitor.id]);

    // Set session
    req.session.visitorId = visitor.id;

    const snapshot = await buildDashboardSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const snapshot = await buildDashboardSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quiz/submit
app.post('/api/quiz/submit', requireSession, async (req, res) => {
  try {
    const score = parseInt(req.body.score);
    const total = parseInt(req.body.total);

    if (!total || total <= 0 || total > 50) {
      return res.status(400).json({ error: 'Invalid total' });
    }
    if (isNaN(score) || score < 0 || score > total) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    const { rows } = await pool.query(`SELECT * FROM visitors WHERE id = $1`, [req.session.visitorId]);
    if (!rows.length) return res.status(404).json({ error: 'Visitor not found' });

    const visitor = rows[0];
    let improved = false;

    if (score > visitor.quiz_best_score) {
      await pool.query(
        `UPDATE visitors SET quiz_completed = TRUE, quiz_best_score = $1, quiz_best_at = NOW() WHERE id = $2`,
        [score, visitor.id]
      );
      improved = true;
    } else {
      await pool.query(`UPDATE visitors SET quiz_completed = TRUE WHERE id = $1`, [visitor.id]);
    }

    const bestScore = improved ? score : visitor.quiz_best_score;
    const perfect = score === total;

    res.json({ score, total, bestScore, improved, perfect });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ─── Static files (your HTML/CSS/JS frontend) ────────────────────────────────
app.use(express.static('public'));

// Guard: /main.html requires session
app.get('/main.html', (req, res, next) => {
  if (!req.session?.visitorId) return res.redirect('/login.html');
  next();
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
