-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run

create table if not exists icons (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  svg_code text not null,
  category text not null check (category in ('colorful', 'mono')),
  created_at timestamptz default now()
);

-- Lock the table down completely from direct client access.
-- All reads/writes go through our own backend API (/api/icons), which uses
-- the secret service_role key that always bypasses Row Level Security anyway.
-- This means the Supabase URL/keys never need to be exposed to the browser.
alter table icons enable row level security;
