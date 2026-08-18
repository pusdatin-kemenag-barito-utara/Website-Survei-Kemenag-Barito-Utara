# SIKAP Kemenag - Survey Platform

Fullstack survey platform (IKM - Indeks Kepuasan Masyarakat) for Kemenag Barito Utara.

- **Frontend**: Astro 7 (SSR, node adapter) + React 19 islands + Tailwind CSS v4 + shadcn/ui
- **Backend**: Go 1.26 + Fiber v2 REST API
- **Database**: PostgreSQL (Supabase-compatible), schema `kemenag_survey`

## Getting Started

Create a root `.env` (see Coolify EV configuration) then:

```bash
npm install          # installs root deps + frontend deps (postinstall)
npm run dev          # Go backend (air, :8080) + Astro dev server (:3000)
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Backend (air hot-reload) + frontend (astro dev) |
| `npm run dev:no-air` | Backend (go run) + frontend |
| `npm run build:frontend` | `astro build` → `frontend/dist` |
| `npm run build:backend` | `go build` → `backend/bin/server` |

Frontend runs with `dotenv-cli -e ../.env -- astro ...` so the single root `.env` is shared.

## Architecture Notes

- All UI components live in `frontend/src/react/` and are mounted per-page as React islands (`client:only="react"`).
- Next.js compatibility is provided by the `frontend/src/next/` shim layer (`navigation`, `link`, `image`, `server`), so React code stays framework-agnostic.
- Client-side env vars use `PUBLIC_*` names (read via `import.meta.env`); server-side code uses `process.env`.
- Middleware (`frontend/src/middleware.ts`) handles maintenance mode, optional same-origin `/api/v1` proxy to the Go backend, and Supabase session refresh.
- Deploy via `Dockerfile` (Astro standalone SSR on :3000, Go API on :8080).

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [Astro View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)