require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connect } = require('./db');
const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const transactionsRoutes = require('./routes/transactions');
const requireAuth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS: allow developer to set FRONTEND_ORIGIN or default to allow all
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public auth route
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/people', requireAuth, peopleRoutes);
app.use('/api', requireAuth, transactionsRoutes);

// Serve frontend static files from project frontend/ for convenience
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });