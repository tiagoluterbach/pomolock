# PomoLock

A Pomodoro timer with hyperfocus mode, a study heatmap, a Data Science roadmap and cross-device sync.

**[pomolock.vercel.app](https://pomolock.vercel.app)** · [Versão em português](./README.md)

## Why it exists

I wanted a simple Pomodoro timer that showed my consistency like a habit tracker, in the style of
[YeolPumTa (열품타)](https://play.google.com/store/apps/details?id=com.pallo.passiontimerscoped), and that
worked the same on my home computer and at university. I could not find one, so I built it.

## Features

- **Pomodoro timer** with configurable focus, short break and long break.
- **Hyperfocus**: when enabled, the timer does not cut your focus when a Pomodoro ends. Extra time keeps
  counting until you decide to take the break.
- **Statistics**: a monthly heatmap of hours studied per day and a day streak.
- **Roadmap**: a checklist of Data Science areas (Python, SQL, Statistics, Machine Learning...) with progress
  per area.
- **Optional Google sign-in** with settings and sessions synced to the cloud.
- **Works offline and installs as a PWA**. Sessions recorded offline are uploaded when the connection returns.
- **Custom alarms and colors**, plus JSON data export.

## Tech stack

| Area | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Lucide |
| State | Zustand with localStorage persistence |
| Auth and database | Supabase (Google OAuth and PostgreSQL) |
| Tests | Vitest and Testing Library |
| Deployment | Vercel |

## Project structure

```
src/
  app/            pages (timer, dashboard, roadmap, settings, login, auth callback)
  components/
    timer/        timer screen and controls
    dashboard/    heatmap and month navigation
    settings/     one settings section per file
    auth/         Google icon and avatar
    ui/           shadcn/ui base components
  data/           roadmap content
  hooks/          React hooks (user, timer, sessions)
  lib/            auth, sync, statistics, export, utilities
  stores/         global state (timer and roadmap progress)
  types/          types and default settings
  __tests__/      tests
supabase/         table and access policy SQL
public/           icons, sounds, service worker and timer worker
docs/             technical notes (how the timer clock works)
```

## Running locally

Requirements: Node.js 20 or newer and pnpm.

```bash
git clone https://github.com/tiagoluterbach/pomolock.git
cd pomolock
pnpm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
pnpm dev
```

The app runs at `http://localhost:3000`. Without the Supabase variables the timer does not load, because the
auth client is created on startup.

### Supabase

1. Create a Supabase project and copy its URL and `anon` key into `.env.local`.
2. Run [`supabase/migration.sql`](./supabase/migration.sql) in the SQL Editor.
3. Under Authentication > Providers, enable Google with your Google Cloud OAuth credentials.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | development server |
| `pnpm build` | production build |
| `pnpm lint` | ESLint |
| `pnpm test` | tests in watch mode |
| `pnpm test:run` | run tests once |

## About development

This project was built with AI as a pair programmer, used for architecture, implementation, debugging and
code review.

## License

Personal and educational use. Feel free to take inspiration from it.

---

Built by **Tiago Luterbach**, Computer Science student at UFF.
