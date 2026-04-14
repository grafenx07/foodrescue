require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const claimRoutes = require('./routes/claims');
const volunteerRoutes = require('./routes/volunteer');
const donorRoutes = require('./routes/donor');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/claim', claimRoutes);
app.use('/api/tasks', volunteerRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 FoodRescue server running on http://localhost:${PORT}`);
});
