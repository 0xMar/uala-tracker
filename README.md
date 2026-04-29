# UALA Tracker

Web app to upload Ualá credit card PDF statements, track transactions, and visualize spending — with per-user data isolation.

| Light mode | Dark mode |
|---|---|
| ![Light mode](light_mode.png) | ![Dark mode](dark_mode.png) |

## Features

- **PDF upload** — upload Ualá statements and extract data automatically via a Python API
- **Dashboard** — KPIs, spending by type, top merchants, and monthly evolution chart
- **Installments** — active installment tracking with remaining amounts and projected due dates
- **Statement management** — list all statements, mark as paid
- **Multi-user** — each user sees only their own data (Supabase RLS)
- **Auth** — sign up, login, and session management via Supabase

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Supabase](https://supabase.com) — PostgreSQL + Auth + RLS
- [Vercel Python Function](https://vercel.com/docs/functions/runtimes/python) — PDF extraction via `pypdf`

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/0xMar/uala-tracker.git
cd uala-tracker
pnpm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and run the schema from [`scripts/001_schema.sql`](scripts/001_schema.sql).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 4. Install Python dependencies

The PDF extraction runs as a Vercel Python Function. Install its dependencies:

```bash
pip install -r api/extract/requirements.txt
```

### 5. Run locally

Use `vercel dev` instead of `pnpm dev` — this runs both Next.js and the Python Function together:

```bash
npx vercel dev
```

Open [http://localhost:3000](http://localhost:3000).

> `pnpm dev` works for UI-only development, but PDF uploads will fail since `/api/extract` won't be available.

## PDF processing

The extraction runs as a Vercel Python Function at `POST /api/extract`. It receives the PDF, processes it in memory with `pypdf`, and returns structured JSON — the file is never persisted.

## Demo

A read-only demo with mock data is available at [v0-uala-tracker-frontend.vercel.app/demo](https://v0-uala-tracker-frontend.vercel.app/demo).
