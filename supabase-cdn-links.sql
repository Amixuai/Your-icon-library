-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- This creates the cdn_links table used for rotating public CDN links
-- (Generate/Push workflow, 7-day auto-expiry, permanent admin link, Private mode)

create table if not exists cdn_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  link_type text not null check (link_type in ('public', 'admin')),
  status text not null default 'active' check (status in ('pending', 'active')),
  is_public boolean not null default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table cdn_links enable row level security;
-- No public policies — only the backend (using the secret service_role key)
-- ever reads/writes this table, same pattern as the icons table.
