const crypto = require('crypto');
const { supabaseRequest } = require('./_lib/supabase');
const { requireAdmin } = require('./_lib/auth');

function makeToken() {
  return crypto.randomBytes(12).toString('base64url'); // short, URL-safe, unguessable
}

function buildTags(origin, token) {
  return {
    cssUrl: `${origin}/cdn/${token}.css`,
    jsUrl: `${origin}/cdn/${token}.js`,
    cssTag: `<link rel="stylesheet" href="${origin}/cdn/${token}.css">`,
    jsTag: `<script src="${origin}/cdn/${token}.js" defer></script>`,
  };
}

module.exports = async (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const origin = `https://${req.headers.host}`;

  try {
    // Ensure a permanent admin link always exists (created once, never expires,
    // never touched by the expiry cron).
    let [adminRow] = await supabaseRequest(
      `cdn_links?select=*&link_type=eq.admin&limit=1`,
      { method: 'GET' }
    );
    if (!adminRow) {
      const created = await supabaseRequest('cdn_links', {
        method: 'POST',
        body: JSON.stringify({
          token: makeToken(),
          link_type: 'admin',
          status: 'active',
          is_public: true,
          expires_at: null,
        }),
      });
      adminRow = Array.isArray(created) ? created[0] : created;
    }

    if (req.method === 'GET') {
      const [activeRow] = await supabaseRequest(
        `cdn_links?select=*&link_type=eq.public&status=eq.active&limit=1`,
        { method: 'GET' }
      );
      const [pendingRow] = await supabaseRequest(
        `cdn_links?select=*&link_type=eq.public&status=eq.pending&order=created_at.desc&limit=1`,
        { method: 'GET' }
      );

      res.status(200).json({
        adminLink: { ...adminRow, ...buildTags(origin, adminRow.token) },
        activeLink: activeRow
          ? { ...activeRow, ...buildTags(origin, activeRow.token) }
          : null,
        pendingLink: pendingRow
          ? { ...pendingRow, ...buildTags(origin, pendingRow.token) }
          : null,
      });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          body = {};
        }
      }
      const action = body && body.action;

      if (action === 'generate') {
        // Remove any old pending link first (only one pending at a time)
        await supabaseRequest(`cdn_links?link_type=eq.public&status=eq.pending`, {
          method: 'DELETE',
        });
        const created = await supabaseRequest('cdn_links', {
          method: 'POST',
          body: JSON.stringify({
            token: makeToken(),
            link_type: 'public',
            status: 'pending',
            is_public: true,
            expires_at: null,
          }),
        });
        const row = Array.isArray(created) ? created[0] : created;
        res.status(200).json({ pendingLink: { ...row, ...buildTags(origin, row.token) } });
        return;
      }

      if (action === 'push') {
        const [pendingRow] = await supabaseRequest(
          `cdn_links?select=*&link_type=eq.public&status=eq.pending&order=created_at.desc&limit=1`,
          { method: 'GET' }
        );
        if (!pendingRow) {
          res.status(400).json({ error: 'No pending link to push. Generate one first.' });
          return;
        }

        // Delete the currently active public link (old external tags stop working)
        await supabaseRequest(`cdn_links?link_type=eq.public&status=eq.active`, {
          method: 'DELETE',
        });

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const updated = await supabaseRequest(`cdn_links?id=eq.${pendingRow.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'active', expires_at: expiresAt }),
        });
        const row = Array.isArray(updated) ? updated[0] : updated;
        res.status(200).json({ activeLink: { ...row, ...buildTags(origin, row.token) } });
        return;
      }

      if (action === 'toggle') {
        const [activeRow] = await supabaseRequest(
          `cdn_links?select=*&link_type=eq.public&status=eq.active&limit=1`,
          { method: 'GET' }
        );
        if (!activeRow) {
          res.status(400).json({ error: 'No active public link to toggle.' });
          return;
        }
        const updated = await supabaseRequest(`cdn_links?id=eq.${activeRow.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_public: !activeRow.is_public }),
        });
        const row = Array.isArray(updated) ? updated[0] : updated;
        res.status(200).json({ activeLink: { ...row, ...buildTags(origin, row.token) } });
        return;
      }

      res.status(400).json({ error: 'Unknown action' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
};
