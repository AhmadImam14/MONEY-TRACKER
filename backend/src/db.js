const mongoose = require('mongoose');

async function connect() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/money_custody';
  if (!process.env.MONGODB_URI) {
    console.warn('Warning: MONGODB_URI not set. Falling back to local MongoDB at', MONGODB_URI);
  }
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
}

module.exports = { connect };
