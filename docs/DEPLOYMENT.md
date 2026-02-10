# Deployment Guide — Railway

Both frontend (Next.js) and backend (Express) run on Railway as separate services within the same project. PostgreSQL and Redis are Railway add-on services.

## Architecture on Railway

```
Railway Project: MeowLah
├── Service: frontend       (Next.js standalone, port 3000)
├── Service: backend        (Express API, port 4000)
├── Service: postgres       (Railway PostgreSQL add-on)
├── Service: redis          (Railway Redis add-on)
└── External: Cloudflare R2 (media storage)
```

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository (`hamkasu/MeowLah`)

---

## Step 2: Add PostgreSQL

1. Click **+ New** → **Database** → **PostgreSQL**
2. Once created, open the PostgreSQL service settings
3. In the **Data** tab, open the SQL console and run:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

> **Note:** Railway PostgreSQL supports PostGIS. If your plan doesn't include it, use [Neon](https://neon.tech) or [Supabase](https://supabase.com) as an external PostgreSQL provider with PostGIS enabled.

4. Copy the `DATABASE_URL` from the **Connect** tab (you'll need it for the backend service)

---

## Step 3: Add Redis

1. Click **+ New** → **Database** → **Redis**
2. Copy the `REDIS_URL` from the **Connect** tab

---

## Step 4: Deploy Backend Service

1. Click **+ New** → **GitHub Repo** → select `hamkasu/MeowLah`
2. Set **Root Directory** to `backend`
3. Railway will auto-detect Node.js via Nixpacks (or use the `Dockerfile`)

### Environment Variables

Set these in the backend service's **Variables** tab:

```
PORT=4000
NODE_ENV=production

# Reference Railway's internal variables
DATABASE_URL=${{postgres.DATABASE_URL}}
REDIS_URL=${{redis.REDIS_URL}}

# JWT secrets (generate with: openssl rand -hex 32)
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# S3-compatible storage (Cloudflare R2)
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_BUCKET=meowlah-media
S3_ACCESS_KEY=<r2_access_key>
S3_SECRET_KEY=<r2_secret_key>
S3_REGION=auto
S3_PUBLIC_URL=https://media.meowlah.my

# Web Push VAPID keys (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=<vapid_public_key>
VAPID_PRIVATE_KEY=<vapid_private_key>
VAPID_SUBJECT=mailto:admin@meowlah.my

# Frontend URL for CORS
FRONTEND_URL=https://<frontend-service>.up.railway.app
```

> **Tip:** Use `${{postgres.DATABASE_URL}}` syntax to reference Railway service variables — they auto-update if the service restarts.

### Build & Start

Railway auto-detects these from `railway.toml`, but you can also set them manually:

```
Build Command:  npm install && npm run build
Start Command:  npx prisma migrate deploy && npm run start
```

### Health Check

Set the health check path to `/health` in the service settings.

### Custom Domain

1. In service settings → **Networking** → **Custom Domain**
2. Add `api.meowlah.my`
3. Configure DNS: `CNAME api → <backend-service>.up.railway.app`

---

## Step 5: Deploy Frontend Service

1. Click **+ New** → **GitHub Repo** → select `hamkasu/MeowLah` again
2. Set **Root Directory** to `frontend`
3. Railway will auto-detect Next.js

### Environment Variables

```
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=production

# These are build-time variables (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_API_URL=https://api.meowlah.my/v1
NEXT_PUBLIC_APP_URL=https://meowlah.my
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same_vapid_public_key_as_backend>
```

> **Important:** `NEXT_PUBLIC_*` variables are embedded at build time. If you change them, you must trigger a redeploy.

### Build & Start

From `railway.toml` (or set manually):

```
Build Command:  npm install && npm run build
Start Command:  npm run start
```

The `start` script runs `node .next/standalone/server.js` — this is the self-contained Next.js server produced by `output: 'standalone'` in `next.config.js`. No need for `next start`.

### Custom Domain

1. In service settings → **Networking** → **Custom Domain**
2. Add `meowlah.my`
3. Configure DNS: `CNAME @ → <frontend-service>.up.railway.app`

---

## Step 6: Internal Networking (Optional Optimization)

Railway services in the same project can communicate over the private network. Instead of calling the backend via the public URL, the frontend server-side code (SSR, ISR) can use the internal URL:

1. In the backend service settings → **Networking** → enable **Private Networking**
2. Note the internal hostname (e.g., `backend.railway.internal:4000`)
3. Add a server-side env var in the frontend service:

```
API_INTERNAL_URL=http://backend.railway.internal:4000/v1
```

Then update `frontend/src/app/memorial/[slug]/page.tsx` to use `API_INTERNAL_URL` for server-side fetches (falls back to `NEXT_PUBLIC_API_URL` for client-side):

```typescript
const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
```

This avoids public network round-trips for SSR data fetching, reducing latency by ~50ms.

---

## Step 7: Media Storage — Cloudflare R2

1. Create an R2 bucket named `meowlah-media` in your Cloudflare Dashboard
2. Create an API token with R2 read/write permissions
3. Set up a custom domain: `media.meowlah.my` → R2 bucket public access

### CORS Configuration (R2 bucket settings)

```json
[
  {
    "AllowedOrigins": ["https://meowlah.my", "https://*.up.railway.app", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

---

## Step 8: Generate VAPID Keys

Run locally (once):

```bash
npx web-push generate-vapid-keys
```

Output:

```
Public Key:  BNx...
Private Key: abc...
```

Set both in the backend env vars. Set the public key in the frontend env vars (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`).

---

## Railway Cost Estimate

| Service | Plan | Est. Monthly |
|---------|------|-------------|
| Frontend (Next.js) | Hobby / Pro | $5–10 |
| Backend (Express) | Hobby / Pro | $5–10 |
| PostgreSQL | 1GB | $5–7 |
| Redis | 256MB | $3–5 |
| **Total** | | **$18–32/mo** |

> At scale (>50K users), upgrade to Pro plan ($20/mo) for more resources and multiple replicas.

---

## CI/CD

Railway auto-deploys on push to the connected branch. For additional CI steps:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd backend && npm ci && npm run build

  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd frontend && npm ci && npm run build
    env:
      NEXT_PUBLIC_API_URL: https://api.meowlah.my/v1
      NEXT_PUBLIC_APP_URL: https://meowlah.my
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: placeholder
```

---

## Railway CLI (Quick Deploy)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy a specific service
cd backend && railway up
cd frontend && railway up

# View logs
railway logs --service backend
railway logs --service frontend

# Open the deployed URL
railway open
```

---

## Post-Deployment Checklist

- [ ] PostgreSQL has `uuid-ossp` and `postgis` extensions enabled
- [ ] `prisma migrate deploy` ran successfully (check backend deploy logs)
- [ ] All environment variables are set in both services
- [ ] Backend `/health` endpoint returns `{ "status": "ok" }`
- [ ] Frontend loads and service worker registers (`/sw.js`)
- [ ] PWA is installable (test with Chrome DevTools → Application → Manifest)
- [ ] Push notifications work (test with backend VAPID keys)
- [ ] Offline mode: cached posts and memorial pages load without network
- [ ] Memorial page Open Graph meta tags render correctly (test with [opengraph.xyz](https://opengraph.xyz))
- [ ] Lost cat report triggers push to nearby users
- [ ] R2 media uploads work (create a test post with an image)
- [ ] Custom domains are configured with SSL (Railway provides automatic certs)
- [ ] Set up [Sentry](https://sentry.io) or [Railway Observability](https://docs.railway.app/guides/observability) for error tracking

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `ECONNREFUSED` on DB connection | Check `DATABASE_URL` uses `${{postgres.DATABASE_URL}}` syntax |
| Frontend SSR can't reach backend | Enable private networking, use internal URL |
| Service worker not updating | Check `Cache-Control: max-age=0` header on `/sw.js` |
| PostGIS functions not found | Run `CREATE EXTENSION postgis` in Railway SQL console |
| Build fails on `sharp` | Nixpacks handles this automatically; if using Docker, ensure `libc6-compat` is installed |
| Push notifications fail | Verify VAPID keys match between frontend and backend |
| Railway deploy stuck | Check deploy logs; ensure `PORT` env var matches exposed port |
