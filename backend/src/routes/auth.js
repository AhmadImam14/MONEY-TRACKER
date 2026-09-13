const express = require('express');
const router = express.Router();

// Login: validate username/password from env, return a token
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;
  const expectedToken = process.env.AUTH_TOKEN;

  if (!expectedUsername || !expectedPassword || !expectedToken) {
    return res.status(500).json({ error: 'Auth credentials not configured on server' });
  }

  if (username === expectedUsername && password === expectedPassword) {
    return res.json({ token: expectedToken });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

module.exports = router;