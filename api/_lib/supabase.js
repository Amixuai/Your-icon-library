// Server-side only helper. Talks to Supabase using the SECRET (service_role) key.
// This file lives under /api/_lib which Vercel does NOT expose as a public route
// (folders/files starting with "_" inside /api are ignored for routing).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error('Supabase environment variables are not configured on the server');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || 'GET',
    body: options.body,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' ? data.message || JSON.stringify(data) : String(data);
    const err = new Error(message || `Supabase request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

module.exports = { supabaseRequest };
