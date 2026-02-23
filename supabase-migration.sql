-- MIGRATION: Run this ONLY if you already have a tickets table from a previous version.
-- If you're setting up fresh, use supabase-schema.sql instead.

-- Add completed_at column
alter table public.tickets add column if not exists completed_at timestamptz;

-- Add delete policy (needed for the new delete feature)
create policy "Allow public delete" on public.tickets for delete using (true);
