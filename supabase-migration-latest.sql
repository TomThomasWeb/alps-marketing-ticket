-- Alps Marketing Hub - Latest Migration
-- Run this in your Supabase SQL Editor

-- Archive entries: file attachment support
ALTER TABLE archive_entries ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Hub users: profile enhancements + session tracking
ALTER TABLE hub_users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE hub_users ADD COLUMN IF NOT EXISTS avatar_color TEXT;
ALTER TABLE hub_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Broker toolkit: version tracking
ALTER TABLE broker_toolkit ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]';

-- App settings table (stores SLA targets, content types, templates, QR history, policy team, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on key if not exists (needed for reliable upsert)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_key_unique') THEN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- Enable RLS but allow all authenticated + anon access (internal tool)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'app_settings_all' AND tablename = 'app_settings') THEN
    CREATE POLICY app_settings_all ON app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
