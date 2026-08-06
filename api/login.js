const { verifyPassword, sign, TOKEN_TTL_MS } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  const { email, password } = body || {};

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
  const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || '';
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

  if (String(email).trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase()) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = verifyPassword(password, ADMIN_PASSWORD_SALT, ADMIN_PASSWORD_HASH);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = sign({ role: 'admin', email: ADMIN_EMAIL, exp: Date.now() + TOKEN_TTL_MS });
  res.status(200).json({ token, expiresIn: TOKEN_TTL_MS });
};
