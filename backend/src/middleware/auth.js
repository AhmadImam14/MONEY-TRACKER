function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const expectedToken = process.env.AUTH_TOKEN;
  if (!expectedToken) {
    return res.status(500).json({ error: 'AUTH_TOKEN not configured on server' });
  }

  if (!token || token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireAuth;