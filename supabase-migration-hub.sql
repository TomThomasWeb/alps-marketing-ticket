-- MIGRATION: Add archive_entries, leads, and brand_assets tables
-- Run this in Supabase SQL Editor after your existing tickets table.

-- 1. MARKETING ARCHIVE
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
create policy "Archive select" on public.archive_entries for select using (true);
create policy "Archive insert" on public.archive_entries for insert with check (true);
create policy "Archive update" on public.archive_entries for update using (true);
create policy "Archive delete" on public.archive_entries for delete using (true);
alter publication supabase_realtime add table public.archive_entries;

-- 2. LEADS
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
create policy "Leads select" on public.leads for select using (true);
create policy "Leads insert" on public.leads for insert with check (true);
create policy "Leads update" on public.leads for update using (true);
create policy "Leads delete" on public.leads for delete using (true);
alter publication supabase_realtime add table public.leads;

-- 3. BRAND ASSETS
create table if not exists public.brand_assets (
  id uuid default gen_random_uuid() primary key,
  asset_name text not null,
  category text not null default 'logo',
  file_url text not null,
  file_path text,
  created_at timestamp with time zone default now()
);
alter table public.brand_assets enable row level security;
create policy "Assets select" on public.brand_assets for select using (true);
create policy "Assets insert" on public.brand_assets for insert with check (true);
create policy "Assets update" on public.brand_assets for update using (true);
create policy "Assets delete" on public.brand_assets for delete using (true);
alter publication supabase_realtime add table public.brand_assets;
