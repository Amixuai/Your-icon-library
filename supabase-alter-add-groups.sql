-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- This adds the new "group_name" column used for the category filter system
-- (Brands, UI & Simple, Arrows, Security & System, Files & Documents, Communication & Media)

alter table icons add column if not exists group_name text default 'ui-simple';

alter table icons drop constraint if exists icons_group_name_check;
alter table icons add constraint icons_group_name_check
  check (group_name in (
    'brands',
    'ui-simple',
    'arrows',
    'security-system',
    'files-documents',
    'communication-media'
  ));
