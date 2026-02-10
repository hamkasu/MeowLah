# MeowLah — Catstagram + CatFinder Malaysia

A hybrid PWA platform combining a social cat photo feed (Catstagram), a lost/found cat reporting system with map view (CatFinder), and a digital Cat Memorial Garden.

## Features

- **Catstagram** — Social feed for posting cat photos/videos with likes, comments, follows, and hashtags
- **CatFinder** — Report lost/found cats with map view, push alerts to nearby users, and AI photo matching
- **Cat Memorial Garden** — Create beautiful memorial pages for cats who have passed, with tributes and condolences
- **PWA** — Installable, works offline, background sync, push notifications

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TailwindCSS, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + PostGIS |
| Cache | Redis |
| Storage | S3-compatible (Cloudflare R2) |
| Maps | Leaflet + OpenStreetMap |
| Push | Web Push API (VAPID) |

## Project Structure

```
MeowLah/
├── docs/
│   ├── ARCHITECTURE.md          # System architecture diagram
│   ├── API_ENDPOINTS.md         # Full REST API documentation
│   ├── DATABASE_SCHEMA.sql      # Raw SQL schema
│   ├── DEPLOYMENT.md            # Vercel + Railway deployment guide
│   ├── MONETIZATION.md          # Revenue streams and pricing
│   └── SCALING_STRATEGY.md      # Scaling plan for 100K-500K users
│
├── frontend/                    # Next.js 14 PWA
│   ├── public/
│   │   ├── manifest.json        # Web App Manifest
│   │   ├── sw.js                # Service Worker
│   │   ├── offline.html         # Offline fallback page
│   │   └── icons/               # App icons (all sizes)
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── layout.tsx       # Root layout with PWA setup
│   │   │   ├── page.tsx         # Root redirect to /feed
│   │   │   ├── feed/            # Catstagram feed
│   │   │   ├── explore/         # Explore/trending
│   │   │   ├── lost-cats/       # CatFinder pages
│   │   │   │   ├── page.tsx     # Map + list view
│   │   │   │   └── new/         # Report lost cat form
│   │   │   ├── found-cats/
│   │   │   ├── memorial/
│   │   │   │   ├── create/      # Create memorial form
│   │   │   │   └── [slug]/      # Memorial page (SSR + SEO)
│   │   │   ├── memorial-wall/   # Public memorial wall
│   │   │   └── profile/
│   │   ├── components/
│   │   │   ├── feed/
│   │   │   │   └── CatFeedCard.tsx
│   │   │   ├── lost-cats/
│   │   │   │   └── LostCatForm.tsx
│   │   │   ├── memorial/
│   │   │   │   ├── MemorialPage.tsx
│   │   │   │   ├── MemorialCreateForm.tsx
│   │   │   │   └── MemorialWall.tsx
│   │   │   ├── map/
│   │   │   │   └── MapView.tsx
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   ├── Providers.tsx
│   │   │   │   └── ServiceWorkerRegistrar.tsx
│   │   │   ├── install/
│   │   │   │   └── InstallPrompt.tsx
│   │   │   └── ui/
│   │   │       └── OfflineBanner.tsx
│   │   ├── hooks/
│   │   │   ├── use-online-status.ts
│   │   │   └── use-push-notifications.ts
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios client with JWT
│   │   │   └── offline-queue.ts # IndexedDB offline queue
│   │   ├── store/
│   │   │   ├── auth-store.ts    # Zustand auth store
│   │   │   └── feed-store.ts    # Zustand feed store
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── types/
│   │       └── index.ts
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                     # Express + TypeScript API
│   ├── prisma/
│   │   └── schema.prisma        # Prisma ORM schema
│   ├── src/
│   │   ├── server.ts            # Express app entry point
│   │   ├── config/
│   │   │   ├── env.ts           # Environment variables
│   │   │   ├── database.ts      # Prisma client singleton
│   │   │   ├── redis.ts         # Redis client + cache helpers
│   │   │   └── s3.ts            # S3 upload/delete helpers
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT auth middleware
│   │   │   ├── error-handler.ts # Global error handler
│   │   │   └── upload.ts        # Multer file upload config
│   │   ├── routes/
│   │   │   ├── auth.ts          # Register, login, refresh
│   │   │   ├── users.ts         # Profile, follow, location
│   │   │   ├── posts.ts         # CRUD, likes, comments
│   │   │   ├── lost-cats.ts     # Report, nearby, sightings
│   │   │   ├── found-cats.ts    # Report found cats
│   │   │   ├── memorials.ts     # CRUD, tributes, condolences
│   │   │   ├── notifications.ts # List, read, read-all
│   │   │   └── boosts.ts       # Boosts + subscriptions
│   │   ├── services/
│   │   │   ├── push-notification.ts  # Web Push + nearby alerts
│   │   │   └── ai-match.ts          # AI matching pseudocode + MVP
│   │   └── jobs/
│   │       └── expire-boosts.ts      # Cron job for boost expiry
│   └── package.json
│
└── .gitignore
```

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env    # Edit with your database/Redis/S3 credentials
npm install
npx prisma migrate dev  # Create database tables
npm run dev              # Starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # Starts on http://localhost:3000
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System diagram and data flow
- [API Endpoints](docs/API_ENDPOINTS.md) — Full REST API reference
- [Database Schema](docs/DATABASE_SCHEMA.sql) — PostgreSQL + PostGIS schema
- [Deployment](docs/DEPLOYMENT.md) — Railway deployment guide (frontend + backend)
- [Monetization](docs/MONETIZATION.md) — Revenue streams and pricing
- [Scaling Strategy](docs/SCALING_STRATEGY.md) — Plan for 100K-500K users
