# Deploying the Chessko backend

The online half of Chessko is two containers:

| Service   | Image built from | Port | Role                                   |
| --------- | ---------------- | ---- | -------------------------------------- |
| `backend` | `backend/`       | 8080 | Java API: Stockfish analysis, commentary |
| `vision`  | `vision/`        | 8000 | Python: screenshot → FEN               |

The mobile app's offline study features (openings, puzzles, trainers) don't call any of
this — only live analysis, vision import, and game review do.

## Local / VPS run

Secrets come from `backend/.env` (see `backend/.env` for the keys; OpenAI + Supabase are
optional — without them only `/api/v1/analysis/commentary` returns 503).

```bash
docker compose up --build          # API on http://<host>:8080
```

Smoke test:

```bash
curl -s http://localhost:8080/api/v1/analysis \
  -H 'content-type: application/json' \
  -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}'
```

## Public HTTPS (required before store release)

iOS App Transport Security requires HTTPS, so a released app must hit `https://…`, not an
IP. The `tls` profile adds Caddy, which obtains and renews a Let's Encrypt cert automatically.

1. Point a DNS A/AAAA record (e.g. `api.yourdomain.com`) at the host.
2. Set the domain and start with the profile:

```bash
export CADDY_DOMAIN=api.yourdomain.com   # or put it in ./.env (see .env.example)
docker compose --profile tls up -d --build
```

Caddy serves `https://api.yourdomain.com` → `backend:8080`. Once it's up, set the mobile
app's `EXPO_PUBLIC_API_BASE_URL` to that HTTPS URL and drop the `ports: 8080` publish from
`docker-compose.yml` if you don't want the plain-HTTP port exposed.

## Notes

- **Persistence:** enrolled vision themes are written to the `vision-data` volume; they
  survive restarts and image rebuilds.
- **Stockfish tuning:** `STOCKFISH_POOL_SIZE` (default 4) × 64 MB hash each drives memory.
  Size the host accordingly, or lower it in `backend/.env`.
- **CORS:** native app builds don't send a browser `Origin`, so CORS only matters for the
  Expo web build. Set `CHESSKO_CORS_ALLOWED_ORIGINS` in `backend/.env` if you ship web.
