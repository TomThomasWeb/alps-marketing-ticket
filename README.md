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

## Tech Stack

- React 18
- Vite
- Supabase (PostgreSQL + real-time + Storage)
- Deployed on Vercel
