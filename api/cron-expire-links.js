const { supabaseRequest } = require('./_lib/supabase');

module.exports = async (req, res) => {
  // Vercel automatically sends this header on real cron invocations. Verifying
  // it stops anyone else from hitting this URL and triggering deletions.
  const authHeader = req.headers['authorization'] || '';
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Delete active public links that passed their 7-day expiry
    await supabaseRequest(
      `cdn_links?link_type=eq.public&status=eq.active&expires_at=lt.${encodeURIComponent(nowIso)}`,
      { method: 'DELETE' }
    );

    // Housekeeping: delete abandoned "generated but never pushed" links after 1 day
    await supabaseRequest(
      `cdn_links?link_type=eq.public&status=eq.pending&created_at=lt.${encodeURIComponent(dayAgoIso)}`,
      { method: 'DELETE' }
    );

    res.status(200).json({ ok: true, ranAt: nowIso });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
};
