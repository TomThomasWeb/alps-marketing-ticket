# Alps Marketing Hub

Internal ticket management system for the Alps marketing team. Team members submit requests via a form, and tickets are managed through a password-protected dashboard.

## Features

- **Ticket submission** — name, title, description, priority, deadline, and file attachments
- **Sequential references** — M000, M001, M002 etc.
- **Dashboard** — filterable, sortable, searchable by ticket reference
- **Password-protected** dashboard access
- **Notes** — add timestamped, named notes to any ticket
- **Due date tracking** — colour-coded badges showing days until deadline

## Local Development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel will auto-detect Vite — no config changes needed
4. Click **Deploy**

The build command (`vite build`) and output directory (`dist`) are picked up automatically.

## Tech Stack

- React 18
- Vite
- Deployed on Vercel
