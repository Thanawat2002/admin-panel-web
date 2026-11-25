# Admin Panel

A web dashboard for FiveM server admins to browse the logs that in-game scripts record — money, items, deaths, vehicles, admin commands and more.
Sign-in is with Discord and limited to an allowlist of Discord IDs.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features
- **Script → Type sidebar** with log counts for the last 24 hours and search — scales to hundreds of scripts
- **Filters** by time range (`1h` `24h` `7d` `30d` or a custom range) and by player (Discord ID)
- **Log details** as key/value pairs, with Copy JSON and copy Discord ID
- **Filters live in the URL** — share links with other admins, and the Back button works
- **Mobile friendly** — the sidebar becomes a drawer and logs become cards
- **Dark theme** with accessibility in mind (keyboard focus, aria labels, reduced motion)

## How it fits together
```
FiveM server ── exports.mongodb:log() ──▶ MongoDB (fivem_logs) ◀── Elysia API (VPS) ◀── /api/* ── Admin Panel (Netlify)
```
- **This repo is only the website.** All data comes from the **Admin Panel API** (Elysia + Bun), which runs on the VPS next to MongoDB.
- Next.js proxies `/api/*` to the API through `rewrites` in [`next.config.ts`](next.config.ts), so the site and the API share one origin:
  the login cookie just works and no CORS setup is needed.
- The website never talks to MongoDB directly and holds no secrets.

## Local development
Start the API first (default: `http://localhost:8080`).
```bash
bun install
cp .env.example .env.local   # change API_URL if the API isn't on localhost:8080
bun run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run lint` | Run ESLint |

## Deploying to Netlify
1. **Add new site → Import from GitHub** and pick this repo. Build settings are read from [`netlify.toml`](netlify.toml).
2. Under **Site configuration → Environment variables**, add:
   | Name | Example | Notes |
   |---|---|---|
   | `API_URL` | `https://api.your-domain.com` | Public URL of the API, preferably HTTPS. **Read at build time** — redeploy after changing it. |
3. Deploy.

### Matching API settings
In the API's `.env` on the VPS:
```env
NODE_ENV=production                                   # Secure cookies (requires HTTPS)
WEB_URL=https://<your-site>.netlify.app               # Where users land after signing in
DISCORD_REDIRECT_URI=https://<your-site>.netlify.app/api/auth/callback
```
Add the same redirect URI in the [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects.

Using a custom domain? Replace `<your-site>.netlify.app` with it in all three places.

> Only expose the API to the internet (behind a reverse proxy with HTTPS). Never expose MongoDB's port.

## Project structure
```
app/
├── layout.tsx            Fonts and theme
├── page.tsx              Home page (wraps LogsView in Suspense)
├── logs-view.tsx         Main state: loading logs, menu, filters ↔ URL
├── login/                Login page and OAuth error messages
└── components/
    ├── sidebar.tsx       Script → Type menu with search
    ├── filter-bar.tsx    Time / Player filters and active filter chips
    ├── log-list.tsx      Log rows, details panel, loading skeleton
    ├── top-bar.tsx       Header, mobile menu button, sign out
    ├── filters.ts        Filters ↔ URL ↔ API query
    └── format.ts         Time, number and type-color formatting
lib/api.ts                API client and response types
```

## API endpoints used
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/login` | Redirect to Discord |
| GET | `/api/auth/me` | Current admin (401 = not signed in) |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/logs` | Logs (`resource`, `type`, `identifier`, `from`, `to`, `limit`, `cursor`) |
| GET | `/api/logs/menu` | Script → type menu with 24-hour counts |
