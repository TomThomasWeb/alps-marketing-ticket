# Alps Marketing Hub

Internal ticket management system for the Alps marketing team. Team members submit requests via a form, and tickets are managed through a password-protected dashboard. Tickets sync across all devices in real time via Supabase.

## Features

- **Mobile Friendly** - submit and track tickets from your phone, and on the go, with a responsive layout that works on any screen size
- **Quick Templates** - pre-filled forms for common requests like social media posts, email campaigns, print materials, PowerPoint designs, website updates, and video/photo projects
- **Priority & Deadline Management** - set priority levels and deadlines when submitting, with colour-coded overdue warnings so nothing slips through
- **Track Your Ticket** - after submitting, you'll get a reference number you can use to check your ticket's status at any time without needing a password
- **Add Notes** - leave additional comments or updates on any ticket, whether you're the submitter or the person managing it
- **Dark Mode** - full dark theme that respects your system preference, with a manual toggle in the header
- **Markdown Support** - use bold, italic, bullet lists, and links in your ticket descriptions for clearer briefs

## Internal Features

- **Dashboard Overview** - password-protected admin view with filtering, sorting, search, and list/grid views to manage all tickets
- **Pin Important Tickets** - star high-priority or time-sensitive tickets to keep them at the top of the dashboard
- **Analytics** - dedicated analytics tab with completion rates, average turnaround times, 6-month trend charts, priority and status breakdowns, turnaround by priority, top submitters, and week-over-week comparisons
- **Activity Log** - a timeline of everything happening across tickets — submissions, status changes, notes, and updates
- **Browser Notifications** - get a desktop notification the moment a new ticket is submitted, even if the tab is in the background
- **Real-Time Sync** all changes sync instantly across open tabs, so you're always looking at the latest information
- **Ticket Filtering & Search** - filter by status (active, open, in progress, completed) and search across reference, name, or title


## Tech Stack

- React 18
- Vite
- Supabase (PostgreSQL + real-time + Storage)
- Deployed on Vercel
