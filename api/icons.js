const { supabaseRequest } = require('./_lib/supabase');
const { requireAdmin } = require('./_lib/auth');

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const VALID_GROUPS = [
  'brands',
  'ui-simple',
  'arrows',
  'security-system',
  'files-documents',
  'communication-media',
];

function setCors(res) {
  // GET is public read-only data (needed so any external website can load the
  // icon list via the CDN script). Write operations always require the admin
  // token regardless of origin, so allowing CORS here does not weaken security.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const category = req.query.category;
      const group = req.query.group;
      const search = req.query.search;
      let path = 'icons?select=id,name,svg_code,category,group_name,tags,created_at&order=created_at.desc';
      if (category === 'colorful' || category === 'mono') {
        path += `&category=eq.${category}`;
      }
      if (group && VALID_GROUPS.indexOf(group) !== -1) {
        path += `&group_name=eq.${group}`;
      }
      if (search) {
        path += `&name=ilike.*${encodeURIComponent(String(search))}*`;
      }
      const data = await supabaseRequest(path, { method: 'GET' });
      res.status(200).json({ icons: data });
      return;
    }

    if (req.method === 'POST') {
      const admin = requireAdmin(req);
      if (!admin) {
        res.status(401).json({ error: 'Unauthorized' });
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

      const items = Array.isArray(body.icons) ? body.icons : [body];
      const results = [];
      const errors = [];

      for (const item of items) {
        const { name, svg_code, category, group, tags } = item || {};
        if (!name || !svg_code || !category) {
          errors.push({ name, error: 'Missing name, svg_code, or category' });
          continue;
        }
        if (category !== 'colorful' && category !== 'mono') {
          errors.push({ name, error: 'Category must be "colorful" or "mono"' });
          continue;
        }
        if (!group || VALID_GROUPS.indexOf(group) === -1) {
          errors.push({ name, error: 'A valid category (group) must be selected' });
          continue;
        }
        const groupName = group;
        const slug = slugify(name);
        if (!slug) {
          errors.push({ name, error: 'Invalid icon name' });
          continue;
        }

        try {
          const existing = await supabaseRequest(
            `icons?select=id&name=eq.${encodeURIComponent(slug)}`,
            { method: 'GET' }
          );
          if (existing && existing.length > 0) {
            errors.push({ name: slug, error: 'Icon name already exists, choose a different name' });
            continue;
          }

          const created = await supabaseRequest('icons', {
            method: 'POST',
            body: JSON.stringify({ name: slug, svg_code, category, group_name: groupName, tags: (tags || '').trim() }),
          });
          results.push(Array.isArray(created) ? created[0] : created);
        } catch (e) {
          errors.push({ name: slug, error: e.message });
        }
      }

      const status = errors.length && !results.length ? 400 : 200;
      res.status(status).json({ created: results, errors });
      return;
    }

    if (req.method === 'PUT') {
      const admin = requireAdmin(req);
      if (!admin) {
        res.status(401).json({ error: 'Unauthorized' });
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
      const { name, svg_code, category, group } = body || {};
      if (!name) {
        res.status(400).json({ error: 'Icon name required' });
        return;
      }
      const updateFields = {};
      if (svg_code) updateFields.svg_code = svg_code;
      if (category) {
        if (category !== 'colorful' && category !== 'mono') {
          res.status(400).json({ error: 'Category must be "colorful" or "mono"' });
          return;
        }
        updateFields.category = category;
      }
      if (group) {
        if (VALID_GROUPS.indexOf(group) === -1) {
          res.status(400).json({ error: 'Invalid group' });
          return;
        }
        updateFields.group_name = group;
      }
      if (Object.keys(updateFields).length === 0) {
        res.status(400).json({ error: 'Nothing to update' });
        return;
      }
      const updated = await supabaseRequest(`icons?name=eq.${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: JSON.stringify(updateFields),
      });
      res.status(200).json({ updated });
      return;
    }

    if (req.method === 'DELETE') {
      const admin = requireAdmin(req);
      if (!admin) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const name = req.query.name;
      if (!name) {
        res.status(400).json({ error: 'Icon name required' });
        return;
      }
      await supabaseRequest(`icons?name=eq.${encodeURIComponent(String(name))}`, {
        method: 'DELETE',
      });
      res.status(200).json({ deleted: name });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
};
