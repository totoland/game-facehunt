# FaceHunt v2 — Manhunt Mode

Self-hosted, **Next.js-only** party game. One player becomes the **TARGET**; everyone else
photographs their face; the **host verifies** matches by hand (no face-detection AI). First 5
verified score 10/6/4/2/1, the target gets +5 for surviving a round, points accumulate across
rounds. See [`PRD.md`](./PRD.md) for the full spec and [`index.html`](./index.html) for the
original design prototype.

## Stack
Next.js 15 (App Router) · React 19 · Tailwind · **SQLite** (`better-sqlite3`) · **SSE** for realtime.
No Docker, no Postgres, no Python, no cloud AI. Photos + DB live in `./data/` (gitignored).

## Run

```bash
npm install
npm run dev          # http://localhost:3099  (hot reload, for development)
# or, for the event:
npm run build && npm run start   # production, port 3099
```

- **Players:** open `http://localhost:3099/` → **Sign in with Google** (restricted to `ALLOWED_HD`) → optional selfie → wait in the lobby.
- **Host:** open `http://localhost:3099/admin` → enter the **admin code** → start rounds, verify the queue, reveal results.
- **Projector / venue screen:** open `http://localhost:3099/projector` (or the **Projector** button in the admin console). Full-screen, landscape, no login — it follows the host live.

The player screen is **state-aware**: it follows the host automatically (lobby → target reveal →
hunter/target → result → standings) over a single SSE connection. No refresh needed.

## Config (`.env.local`)

| Var | Meaning | Default |
|-----|---------|---------|
| `ADMIN_CODE` | passcode for `/admin` | `letmein` |
| `AUTH_SECRET` | signs session cookies — **change for the event** | dev value |
| `PUBLIC_ORIGIN` | public https origin (cookie `secure` + Google callback) | the tunnel URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google SSO credentials (required) | empty |
| `ALLOWED_HD` | restrict Google sign-in to one company domain (e.g. `2c2p.com`) | empty |

Sign-in is **Google SSO only** — there is no guest path.

### Enable Google sign-in
SSO is fully implemented (no extra packages); it stays hidden until you add OAuth keys.
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (type: Web).
2. Add **Authorized redirect URI**: `https://game-facehunt.totoland.cloud/api/auth/callback/google`
   (and `http://localhost:3099/api/auth/callback/google` if you want to test locally).
3. Put the client id/secret in `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), set
   `PUBLIC_ORIGIN` to your public https URL, and optionally `ALLOWED_HD=yourcompany.com` to restrict
   to one domain. Restart the server — the **Sign in with Google** button activates automatically.

Without OAuth keys nobody can sign in (the Google button is shown disabled).

## Game mechanics (P0)
- **Rounds × seconds** configurable in the admin console while in the lobby (default 4 × 60s).
- **Target** is random each round, not repeating until everyone has been target once.
- **Scoring:** first 5 verified hunters → 10/6/4/2/1; one rank max per hunter per round.
- **Target survives** (+5) only if the round ends with **zero** verified catches.
- **Server timestamp is authoritative**; the target can't submit; uploads after the hunt + 5s grace are rejected (HTTP 423).
- **Reset event** (admin) clears rounds/submissions/scores **and kicks every player back to the splash** — so the lobby only contains people who actively re-confirm they're still present (no ghost players in the random target pool).

## Public access (the event)
Run the app on this machine, then expose it with a Cloudflare Tunnel to the registered domain:

```bash
# keep the Mac awake during the event
caffeinate -dimsu &

# tunnel localhost:3099 → https://game-facehunt.totoland.cloud
cloudflared tunnel --url http://localhost:3099            # quick ad-hoc, OR
cloudflared tunnel run facehunt                            # named tunnel mapped to the domain
```

If you enable Google SSO, set the OAuth redirect URL to
`https://game-facehunt.totoland.cloud/api/auth/callback/google` and put the domain in `PUBLIC_ORIGIN`.

## Project layout
```
app/                 player UI (/), admin console (/admin), API route handlers (/api/*)
components/ui.tsx    ported design primitives (SelfieBubble, Pill, Button, Avatar, …) + hooks
lib/                 db (SQLite schema), bus (SSE), session (cookies), game (rules), types
data/                runtime: facehunt.db + photos/  (gitignored)
PRD.md               product spec      index.html  original design prototype
```
