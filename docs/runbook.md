# TransportManager Production Runbook

This checklist captures the minimum steps to run the API and web client in a hardened production setup.

## Environment
- `NODE_ENV=production`
- `DATABASE_URL` pointing to the production Postgres instance
- `SESSION_SECRET` set to a long, random value (never commit)
- `ALLOWED_ORIGINS` comma‑separated list of allowed frontends (e.g. `https://app.example.com,https://admin.example.com`)
- `RATE_LIMIT_WINDOW_MS` (optional, default 15m) and `RATE_LIMIT_MAX` (optional, default 300) to tune throttling
- `ENABLE_RESOURCE_OPTIMIZATION=1` only if you want the scheduler enabled
- Certificates: place `certs/server.crt` and `certs/server.key` with CA‑signed material (do not use self‑signed in prod)

## Build and start
1) Install dependencies: `npm install`
2) Build client and server: `npm run build`
3) Start in production mode: `npm start`

## Security hardening
- CORS: only origins listed in `ALLOWED_ORIGINS` are allowed when `NODE_ENV=production`
- HTTP headers: `helmet` applies security headers and CSP; adjust `connectSrc` in `server/index.ts` if your frontend or websocket endpoint runs on another host
- Rate limiting: `/api` and `/auth` are throttled; tune via env vars
- Sessions: cookies are `httpOnly`, `secure` in production, and use the Postgres store; ensure `trust proxy` is set at the reverse proxy layer if you terminate TLS upstream
- TLS: serve traffic over HTTPS with CA‑signed certs; disable the dev self‑signed certs for prod
- Input validation: keep endpoints validated (existing Zod schemas); reject malformed payloads and avoid logging sensitive fields
- Logging: API logs include status/duration; redirect stdout/stderr to a central log sink with rotation

## Operations
- Health check: `GET /api/ping` (expects `{ ok: true }`)
- Realtime: websockets use the same host; ensure reverse proxy upgrades `Connection: Upgrade`
- Backups: enable daily backups for the Postgres database and test restores
- Monitoring: watch rate-limit rejections, 5xx responses, and database connection pool saturation

## Testing and CI
- Unit tests: `npm run test`
- Coverage: `npm run test:coverage`
- Recommended CI steps: `npm install`, `npm run check`, `npm run build`, `npm run test`
