// Resolve .env from repo root regardless of where node is invoked from.
// On Render: process.cwd() == /opt/render/project/src (the repo root).
// Locally:   process.cwd() == repo root when using `npm run dev` from root.
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists (Render's filesystem is ephemeral — it won't
// survive a redeploy, but at least the folder will be created on each boot).
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const claimRoutes = require('./routes/claims');
const volunteerRoutes = require('./routes/volunteer');
const donorRoutes = require('./routes/donor');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS – in development allow any localhost origin (port may shift when others are running)
// In production only the exact ALLOWED_ORIGIN is permitted
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const isDev = (process.env.NODE_ENV || 'development') === 'development';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // curl, mobile, server-to-server
    if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    if (origin === allowedOrigin) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/claim', claimRoutes);
app.use('/api/tasks', volunteerRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date(), env: process.env.NODE_ENV }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 FoodRescue server running on http://localhost:${PORT}`);
  console.log(`   CORS allowed origin: ${allowedOrigin}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
