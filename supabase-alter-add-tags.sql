-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Adds a "tags" column so admins can attach synonyms/keywords to icons
-- (e.g. icon "cart" -> tags "shopping bag, buy, purchase, discount") for search.

alter table icons add column if not exists tags text default '';
