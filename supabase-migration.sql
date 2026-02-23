-- MIGRATION: Run this ONLY if you already have a tickets table from a previous version.
-- If you're setting up fresh, use supabase-schema.sql instead.

-- Add completed_at column
alter table public.tickets add column if not exists completed_at timestamptz;

-- Add delete policy (needed for the delete feature)
create policy "Allow public delete" on public.tickets for delete using (true);

-- Create storage bucket for file attachments
insert into storage.buckets (id, name, public) values ('ticket-attachments', 'ticket-attachments', true);

-- Allow public access to the storage bucket
create policy "Allow public upload" on storage.objects for insert with check (bucket_id = 'ticket-attachments');
create policy "Allow public read storage" on storage.objects for select using (bucket_id = 'ticket-attachments');
