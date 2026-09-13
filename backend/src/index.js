require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connect } = require('./db');
const peopleRoutes = require('./routes/people');
const transactionsRoutes = require('./routes/transactions');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS: allow developer to set FRONTEND_ORIGIN or default to allow all
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/people', peopleRoutes);
app.use('/api', transactionsRoutes);

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
