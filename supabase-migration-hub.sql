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


-- 4. CONTENT TEMPLATES
create table if not exists public.content_templates (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null default 'other',
  content text not null,
  tags jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);
alter table public.content_templates enable row level security;
create policy "Templates select" on public.content_templates for select using (true);
create policy "Templates insert" on public.content_templates for insert with check (true);
create policy "Templates update" on public.content_templates for update using (true);
create policy "Templates delete" on public.content_templates for delete using (true);
alter publication supabase_realtime add table public.content_templates;

-- Calendar Events table
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date date not null,
  type text not null default 'social',
  description text default '',
  created_at timestamp with time zone default now()
);

alter table public.calendar_events enable row level security;
create policy "Allow all access to calendar_events" on public.calendar_events for all using (true) with check (true);
alter publication supabase_realtime add table public.calendar_events;

-- Session 12: Enhanced features migration

-- Add notes and follow-up to leads
alter table public.leads add column if not exists notes text default '';
alter table public.leads add column if not exists follow_up text default '';

-- Add campaign and performance to archive_entries
alter table public.archive_entries add column if not exists campaign text default '';
alter table public.archive_entries add column if not exists performance text default '';

-- Add calendar_event_id to tickets for calendar linking
alter table public.tickets add column if not exists calendar_event_id uuid;

-- Session 12: Enhanced features migration
-- Leads: add notes, follow_up, and closed status support
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up text DEFAULT '';

-- Archive: add campaign grouping and performance tracking
ALTER TABLE public.archive_entries ADD COLUMN IF NOT EXISTS campaign text DEFAULT '';
ALTER TABLE public.archive_entries ADD COLUMN IF NOT EXISTS performance text DEFAULT '';

-- Tickets: link to calendar events
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS calendar_event_id uuid DEFAULT null;

-- Calendar events: update date on reschedule
-- (no schema change needed, just ensuring realtime is on)

-- Notifications persistence table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icon TEXT,
  title TEXT NOT NULL,
  body TEXT,
  action TEXT,
  time TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
