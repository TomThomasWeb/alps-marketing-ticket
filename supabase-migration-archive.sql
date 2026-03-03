-- Migration: Add archive_entries table for Marketing Archive feature
-- Run this in Supabase SQL Editor

create table if not exists public.archive_entries (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text not null default 'other',
  description text,
  date date,
  link text,
  tags jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

alter table public.archive_entries enable row level security;

create policy "Archive entries are viewable by everyone"
  on public.archive_entries for select using (true);

create policy "Archive entries are insertable by everyone"
  on public.archive_entries for insert with check (true);

create policy "Archive entries are updatable by everyone"
  on public.archive_entries for update using (true);

create policy "Archive entries are deletable by everyone"
  on public.archive_entries for delete using (true);

alter publication supabase_realtime add table public.archive_entries;
