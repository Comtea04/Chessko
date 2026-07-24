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
docker compose up --build          # API on http://127.0.0.1:8080
```

The published port binds to **loopback only**. That is what a public host wants — Caddy reaches the
container over the compose network, and nothing else can get to plain HTTP on 8080. To reach it from
a phone on the same LAN while developing, publish it wider:

```bash
BACKEND_BIND=0.0.0.0 docker compose up -d     # or set it in ./.env
```

Smoke test:

```bash
curl -s http://localhost:8080/health
# {"status":"ok"}

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
app's `EXPO_PUBLIC_API_BASE_URL` to that HTTPS URL. Leave `BACKEND_BIND` unset so 8080 stays on
loopback and every request arrives through Caddy.

> **Do not carry a development `BACKEND_BIND=0.0.0.0` onto the host.** Besides exposing plain
> HTTP on 8080, it lets a caller bypass the rate limiter entirely: the limiter trusts
> `X-Forwarded-For` (which Caddy sets), so a request arriving directly on 8080 can claim any
> client address. If you ever must publish 8080, set
> `CHESSKO_RATE_LIMIT_TRUST_FORWARDED_FOR=false` as well.

### Oracle Cloud (Always Free, ARM)

The free Ampere A1 instances run this fine — every image and wheel involved has an arm64 build.
Two things bite that are specific to Oracle, and both look identical from outside (Caddy hangs
on the ACME challenge and never gets a certificate):

1. **VCN security list / NSG** — ingress rules for TCP 80 and 443 from `0.0.0.0/0`. Only 22 is
   open on a fresh VCN.
2. **Instance-level iptables** — Oracle's Ubuntu images ship a restrictive `INPUT` chain, so
   opening the VCN is not enough:

   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

Let's Encrypt will not issue for a bare IP, so a hostname is required — a free subdomain
(DuckDNS and friends) is enough. Bring-up on a fresh instance:

```bash
git clone https://github.com/Comtea04/Chessko.git && cd Chessko
# backend/.env is not in the repo — copy the 8 keys over from your dev machine
echo "CADDY_DOMAIN=api.yourdomain.duckdns.org" > .env   # no BACKEND_BIND here
docker compose --profile tls up -d --build
```

If the instance is small, lower `STOCKFISH_POOL_SIZE` in `backend/.env` (default 4, each taking
a core and 64 MB of hash).

## Rate limiting

The API has no accounts, so a public deployment is open to whoever finds the domain — and two
endpoints are expensive: `/analysis/commentary` spends OpenAI credits per call, `/analysis/game`
puts up to 200 positions through the engine pool. A token bucket per client address covers both.

| Endpoint | Cost |
| --- | --- |
| `/api/v1/analysis`, `/api/v1/vision/*` | 1 |
| `/api/v1/analysis/commentary` | 10 |
| `/api/v1/analysis/game` | 20 |

Default budget is 60 tokens per minute per client, so 60 analyses, or 6 commentary calls, or 3 game
reviews. Over budget returns `429` with `Retry-After: 60`. `/health` is never counted.

```bash
CHESSKO_RATE_LIMIT_TOKENS_PER_MINUTE=120   # backend/.env
CHESSKO_RATE_LIMIT_ENABLED=false           # local development
```

The client address comes from `X-Forwarded-For`, which Caddy sets. **If you ever publish 8080
directly, set `CHESSKO_RATE_LIMIT_TRUST_FORWARDED_FOR=false`** — otherwise a caller can put any
address in that header and never hit a limit.

Limits are held in memory, per process. Running more than one API node would give each its own
budget; that is the point at which this needs to move to something shared.

## Notes

- **Health:** `GET /health` returns `{"status":"ok"}`; both containers have compose healthchecks,
  so `docker compose ps` reports whether they are actually serving, not just running.
- **Persistence:** enrolled vision themes are written to the `vision-data` volume; they
  survive restarts and image rebuilds.
- **Stockfish tuning:** `STOCKFISH_POOL_SIZE` (default 4) × 64 MB hash each drives memory.
  Size the host accordingly, or lower it in `backend/.env`.
- **CORS:** native app builds don't send a browser `Origin`, so CORS only matters for the
  Expo web build. Set `CHESSKO_CORS_ALLOWED_ORIGINS` in `backend/.env` if you ship web.
