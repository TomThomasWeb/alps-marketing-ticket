# Alps Marketing Hub

Internal marketing management platform for the Alps team. Submit requests, track progress, manage brand assets, and access marketing tools — all in one place.

## Stack

- **React 18** + Vite
- **Supabase** (PostgreSQL, real-time subscriptions, file storage, auth)
- **Lucide React** icons
- **jsPDF** for report generation
- Deployed on **Vercel**

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file from `.env.example` with your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL migrations in your Supabase dashboard:
1. `supabase-schema.sql` — core tables
2. `supabase-migration.sql` — initial migration
3. `supabase-migration-hub.sql` — hub-specific tables and extensions

## Architecture

```
src/
  App.jsx               — Hash router, sidebar layout, state management, handlers
  constants.js          — Priorities, statuses, SLA targets, utilities
  supabaseClient.js     — Supabase connection
  components/
    Tickets.jsx         — TicketForm, TicketCard, GridCard, StatsBar, Dashboard, SubmitterView
    Admin.jsx           — AnalyticsPanel, AdminPanel, RecurringSchedules, TeamGoals
    Resources.jsx       — Archive, Leads, BrandAssets, Templates, Calendar, Gallery, Toolkit, Campaigns, KB
    Tools.jsx           — FileConverter, QR Generator, ImageEditor, MeetingNotes, Repurposer, SelfServiceGuide
    UI.jsx              — PageHeader, HubHome, Login/SignUp, ProfilePage, Toast, Notifications, ActivityLog
```

## Navigation

Sidebar-based navigation with hash routing. Every page has a proper URL that supports browser back/forward and bookmarking.

| Route | Page |
|---|---|
| `#/` | Homepage |
| `#/submit` | Submit a ticket |
| `#/track` | Track a ticket |
| `#/profile` | My Profile |
| `#/archive` | Marketing Archive |
| `#/brand-assets` | Brand Assets |
| `#/gallery` | Alps Gallery |
| `#/calendar` | Content Calendar |
| `#/templates` | Content Templates |
| `#/converter` | File Converter |
| `#/qr` | QR Generator |
| `#/image-editor` | Image Editor |
| `#/repurposer` | Content Repurposer |
| `#/meeting-notes` | Meeting Notes to Tickets |
| `#/knowledge-base` | Knowledge Base |
| `#/broker-toolkit` | Broker Toolkit |
| `#/campaigns` | Campaign Tracker |
| `#/dashboard` | Ticket Dashboard (admin) |
| `#/analytics` | Analytics (admin) |
| `#/admin` | Admin Panel (admin) |
| `#/activity` | Activity Log (admin) |
| `#/leads` | Leads Dashboard (admin) |
| `#/leads/new` | Log a Lead |

**Keyboard shortcut:** Ctrl+K focuses the sidebar search from anywhere.

## Features

### Tickets
- M-prefixed sequential references (M001, M002, ...)
- Four-stage workflow: Open → In Progress → Review → Completed
- SLA tracking: critical (8h), high (48h), medium (120h), low (168h)
- Priority left-border colour coding on ticket cards
- Approval workflow: submitters can approve or request changes
- Threaded comments, inline editing, ticket cloning
- File attachments with inline image previews
- Draft auto-save, kanban/list/grid/queue views, batch actions

### Homepage
- Branded gradient hero with greeting and SVG progress ring
- Status bar, quick submit, "Continue where you left off" card
- Upcoming deadlines, personal activity feed, admin stats, rotating tips
- Sign-up benefits card for logged-out visitors
- Social links (Website, LinkedIn, Facebook, YouTube, Instagram)

### Resources
- Marketing Archive, Brand Assets, Content Templates, Content Calendar
- Alps Gallery, Broker Toolkit, Campaign Tracker, Knowledge Base

### Tools
- File Converter, QR Generator, Image Editor, Content Repurposer
- Meeting Notes to Tickets, Self-Service Guide
- White-Labelled Assets (external link)

### Admin
- Ticket Dashboard, Analytics, Admin Panel, Activity Log, Leads Dashboard

### Users
- Sign up with admin approval, roles: admin/editor/viewer
- Profile page with ticket overview and commenting
- Smart notifications (deadlines, status changes, comments)

## Design System

- **Lucide React** icons throughout — no emojis in UI
- **PageHeader** component with category-coloured icons (teal/blue/purple/indigo)
- Priority left-border on ticket cards
- Consistent `.hub-empty` empty states
- Dark mode with system preference detection
- Responsive: sidebar on desktop, bottom tab bar + hamburger on mobile

## Permissions

| Feature | Public | Logged In | Admin |
|---|---|---|---|
| Submit/track tickets | ✓ | ✓ | ✓ |
| Archive, Brand Assets, Gallery, Tools | ✓ | ✓ | ✓ |
| Calendar, Templates, KB, Campaigns | | ✓ | ✓ |
| Profile, commenting, notifications | | ✓ | ✓ |
| Dashboard, Analytics, Admin Panel | | | ✓ |

## Deployment

```bash
npm run build
```

Deploy `dist/` to Vercel. Hash routing works without server configuration.
