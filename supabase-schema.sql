-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create the tickets table
create table public.tickets (
  id uuid default gen_random_uuid() primary key,
  ref text not null unique,
  name text not null,
  title text not null,
  description text not null,
  priority text not null default 'medium',
  deadline date,
  status text not null default 'open',
  file_names jsonb default '[]'::jsonb,
  notes jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (required by Supabase)
alter table public.tickets enable row level security;

-- 3. Allow public read/write access (since this is an internal tool with password protection)
create policy "Allow public read" on public.tickets for select using (true);
create policy "Allow public insert" on public.tickets for insert with check (true);
create policy "Allow public update" on public.tickets for update using (true);

-- 4. Enable real-time sync for the tickets table
alter publication supabase_realtime add table public.tickets;

-- 5. Create index on ref for fast lookups
create index idx_tickets_ref on public.tickets (ref);
