const { verify, sign, TOKEN_TTL_MS } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const magicToken = req.query.magic || (req.body && req.body.magic);
  const payload = verify(magicToken);

  if (!payload || payload.purpose !== 'magic-login') {
    res.status(401).json({ error: 'This login link is invalid or has expired. Please request a new one.' });
    return;
  }

  // Magic link is valid and unexpired — issue the real admin session token.
  // Stateless: nothing is written to any database or file, this is purely a
  // signed, self-verifying token exactly like the existing session system.
  const sessionToken = sign({ role: 'admin', exp: Date.now() + TOKEN_TTL_MS });
  res.status(200).json({ token: sessionToken });
};
