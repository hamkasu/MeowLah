# Deployment Guide

## Frontend: Vercel

### Setup

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend/`
3. Framework preset: Next.js (auto-detected)

### Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_API_URL=https://api.meowlah.my/v1
NEXT_PUBLIC_APP_URL=https://meowlah.my
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your_vapid_public_key>
```

### Build Settings

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Custom Domain

1. Add `meowlah.my` in Vercel dashboard
2. Configure DNS: CNAME `@` -> `cname.vercel-dns.com`
3. SSL is automatic

### Vercel Configuration (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

---

## Backend: Railway

### Setup

1. Create a new project on Railway
2. Add a **PostgreSQL** service (Railway add-on)
3. Add a **Redis** service (Railway add-on)
4. Connect your GitHub repo, set root directory to `backend/`

### Environment Variables

```
PORT=4000
NODE_ENV=production
DATABASE_URL=<railway_postgres_url>
REDIS_URL=<railway_redis_url>
JWT_SECRET=<generate_with: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate_with: openssl rand -hex 32>
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_BUCKET=meowlah-media
S3_ACCESS_KEY=<r2_access_key>
S3_SECRET_KEY=<r2_secret_key>
S3_PUBLIC_URL=https://media.meowlah.my
VAPID_PUBLIC_KEY=<vapid_public_key>
VAPID_PRIVATE_KEY=<vapid_private_key>
VAPID_SUBJECT=mailto:admin@meowlah.my
FRONTEND_URL=https://meowlah.my
```

### Build & Start Commands

```
Build: npm run build
Start: npm run start
```

### Database Migrations

```bash
# On first deploy, run migrations:
npx prisma migrate deploy

# Enable PostGIS extension (run once via Railway's SQL console):
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Custom Domain

1. In Railway, add custom domain: `api.meowlah.my`
2. Configure DNS: CNAME `api` -> `<railway-domain>.railway.app`

---

## Media Storage: Cloudflare R2

### Setup

1. Create R2 bucket named `meowlah-media` in Cloudflare Dashboard
2. Create API token with R2 read/write permissions
3. Set up custom domain: `media.meowlah.my` -> R2 bucket

### CORS Configuration

```json
[
  {
    "AllowedOrigins": ["https://meowlah.my", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

---

## Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd backend && npm ci && npm run build
      - run: cd frontend && npm ci && npm run build

  # Railway auto-deploys from main branch
  # Vercel auto-deploys from main branch
```

---

## Post-Deployment Checklist

- [ ] Run `npx prisma migrate deploy` on Railway
- [ ] Enable PostGIS in PostgreSQL
- [ ] Generate and set VAPID keys
- [ ] Configure R2 bucket and custom domain
- [ ] Set all environment variables
- [ ] Test service worker registration
- [ ] Verify PWA installability (Lighthouse)
- [ ] Test push notifications
- [ ] Verify offline mode works
- [ ] Test memorial page SEO (Open Graph)
- [ ] Set up error monitoring (Sentry)
- [ ] Configure rate limiting for production
