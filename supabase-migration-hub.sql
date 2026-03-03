-- MIGRATION: Add archive_entries and leads tables for Marketing Hub expansion
-- Run this in Supabase SQL Editor after your existing tickets table is set up.

-- 1. MARKETING ARCHIVE TABLE
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
create policy "Archive viewable" on public.archive_entries for select using (true);
create policy "Archive insertable" on public.archive_entries for insert with check (true);
create policy "Archive updatable" on public.archive_entries for update using (true);
create policy "Archive deletable" on public.archive_entries for delete using (true);
alter publication supabase_realtime add table public.archive_entries;

-- 2. LEADS TABLE
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  broker text not null,
  enquiry text not null,
  source text not null default 'phone',
  logged_by text not null,
  next_steps text not null default 'needs_action',
  created_at timestamp with time zone default now()
);

alter table public.leads enable row level security;
create policy "Leads viewable" on public.leads for select using (true);
create policy "Leads insertable" on public.leads for insert with check (true);
create policy "Leads updatable" on public.leads for update using (true);
create policy "Leads deletable" on public.leads for delete using (true);
alter publication supabase_realtime add table public.leads;
