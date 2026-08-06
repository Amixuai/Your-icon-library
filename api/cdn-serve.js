const { supabaseRequest } = require('./_lib/supabase');

module.exports = async (req, res) => {
  const token = req.query.token;
  const type = req.query.type; // 'css' | 'js'

  if (!token || (type !== 'css' && type !== 'js')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const [row] = await supabaseRequest(
      `cdn_links?select=*&token=eq.${encodeURIComponent(token)}&limit=1`,
      { method: 'GET' }
    );

    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (row.link_type === 'public') {
      if (row.status !== 'active') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (!row.is_public) {
        // Private mode is on — external sites must not be able to load icons
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        // Safety net in case the daily cron hasn't run yet
        res.status(404).json({ error: 'Not found' });
        return;
      }
    }
    // link_type === 'admin' always allowed, never expires

    const destination = type === 'css' ? '/cdn/glyphcraft.css' : '/cdn/icons.js';
    res.setHeader('Cache-Control', 'no-store'); // always re-check on every load
    res.writeHead(302, { Location: destination });
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
};
