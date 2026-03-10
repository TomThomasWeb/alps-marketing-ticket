# Alps Marketing Hub

Internal marketing management platform for the Alps team. Submit and track requests, manage content, log leads, and access a suite of marketing tools — all synced in real time via Supabase.

## Features

### Ticket Management
- **Submit requests** — name, title, description, priority, deadline, and file attachments
- **Sequential references** — M000, M001, M002 etc.
- **4-stage workflow** — Open → In Progress → Review → Completed
- **Approval workflow** — submitters can approve or request changes when a ticket is in review
- **Threaded comments** — conversation on tickets with user avatars
- **Inline editing** — edit ticket title and description after submission
- **Ticket cloning** — duplicate a ticket to pre-fill the form
- **SLA tracking** — automatic tracking against priority-based targets (critical: same day, high: 2 days, medium: 5 days, low: 7 days)
- **File attachments** — uploaded to Supabase Storage with inline image previews
- **Due date tracking** — colour-coded badges with overdue warnings
- **Smart notifications** — status changes, deadline reminders, comments, and review alerts
- **Undo on actions** — undo complete or delete via toast notification
- **Dashboard views** — list, grid, and queue views with full-text search

### User Accounts
- **Sign up & login** — username/password with admin approval
- **Role-based access** — admin, editor, and viewer roles
- **Personal profile** — tickets split by status, leads, and notifications
- **Personalised homepage** — greeting by name and personal ticket counts

### Content & Resources
- **Marketing Archive** — past campaigns, posts, and materials
- **Brand Assets** — logos, backgrounds, and templates
- **Content Calendar** — monthly view with drag-and-drop
- **Alps Gallery** — photo library with categories and search
- **Broker Toolkit** — broker-facing materials by product line
- **Campaign Tracker** — group tickets, content, and leads under campaigns
- **Knowledge Base** — searchable articles and guides
- **Content Templates** — reusable copy blocks with one-click copy

### Analytics & Reporting
- **Ticket metrics** — completion rates, turnaround, priority breakdown, trends
- **SLA performance** — percentage meeting targets, active breaches
- **Weekly email digest** — formatted summary for stakeholders
- **Monthly PDF report** — branded export with all metrics
- **Team goals** — KPIs across tickets, content, and leads

### Tools
- **Meeting Notes to Tickets** — extract action items and batch-create tickets
- **Content Repurposer** — long-form to LinkedIn, email, social, and X threads
- **File Converter** — convert and resize images with social presets
- **QR Code Generator** — custom colours and logo overlay
- **Image Editor** — crop, resize, watermarks, and brand overlays

### Admin
- **Admin Panel** — health overview, data export (JSON/CSV)
- **Out of Office** — toggle with return date and homepage banner
- **Announcements** — publish messages visible to all users
- **Recurring Tickets** — automated creation on schedules
- **User Management** — add, edit, approve, remove accounts
- **Audit Log** — track admin actions

### Design
- **Dark mode** — light/dark toggle, auto-detects system preference
- **Mobile-friendly** — responsive with bottom navigation
- **Loading skeletons** — shimmer loading states

## Project Structure

```
src/
  constants.js            — shared constants and utility functions
  supabaseClient.js       — Supabase connection
  App.jsx                 — main app, state management, handlers
  components/
    Tickets.jsx           — TicketForm, TicketCard, Dashboard, SubmitterView
    Admin.jsx             — AnalyticsPanel, AdminPanel, TeamGoals
    Resources.jsx         — Archive, Leads, BrandAssets, Calendar, Gallery, more
    Tools.jsx             — FileConverter, QR, ImageEditor, MeetingNotes, Repurposer
    UI.jsx                — HubHome, Auth, Profile, Toast, Notifications
```

## Setup

### 1. Create a Supabase Project
Go to [supabase.com](https://supabase.com), create a project, and wait for setup.

### 2. Run the Database Schema
In Supabase SQL Editor, paste and run `supabase-schema.sql`.

### 3. Get API Keys
Settings → API → copy Project URL and anon key.

### 4. Deploy to Vercel
Push to GitHub, import to Vercel, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.

### 5. Local Development
```bash
cp .env.example .env
npm install
npm run dev
```

## Upgrading
Run `supabase-migration-hub.sql` to add new tables without touching existing data.

## Tech Stack
React 18 · Vite · Supabase (PostgreSQL + real-time + Storage) · Vercel
