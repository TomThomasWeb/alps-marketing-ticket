# Alps Marketing Hub

Internal ticket management system for the Alps marketing team. Team members submit requests via a form, and tickets are managed through a password-protected dashboard. Tickets sync across all devices in real time via Supabase.

## Features

- **Ticket submission** — name, title, description, priority, deadline, and file attachments
- **File attachments** — uploaded to Supabase Storage, downloadable from the dashboard
- **Sequential references** — M000, M001, M002 etc.
- **Dashboard** — filterable, sortable, searchable by ticket reference
- **List & Grid views** — toggle between detailed list and compact grid
- **Password-protected** dashboard access
- **Notes** — add timestamped, named notes to any ticket
- **Due date tracking** — colour-coded badges showing days until deadline
- **Completion dates** — automatic timestamp when a ticket is marked complete
- **Delete tickets** — with confirmation prompt
- **Real-time sync** — tickets shared across all devices and users via Supabase

## Setup Guide

### 1. Create a Supabase Project (free)

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**, give it a name (e.g. "alps-marketing-hub"), set a database password, and choose a region close to you (e.g. London)
3. Wait for the project to finish setting up (~1 minute)

### 2. Create the Database Table & Storage

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql` from this repo
4. Click **Run** — you should see "Success" for each statement

This creates the tickets table, enables real-time sync, and sets up file storage.

### 3. Get Your API Keys

1. In the Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon / public key** (the long string under "Project API keys")

### 4. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Before clicking Deploy, go to **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL from step 3
   - `VITE_SUPABASE_ANON_KEY` = your anon key from step 3
4. Click **Deploy**

### 5. Local Development (optional)

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

## Upgrading from a Previous Version

If you already have a Supabase database from a previous deployment, run `supabase-migration.sql` in the SQL Editor instead of the full schema. This adds new columns and the storage bucket without touching existing data.

## Tech Stack

- React 18
- Vite
- Supabase (PostgreSQL + real-time + Storage)
- Deployed on Vercel
