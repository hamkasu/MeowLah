# MeowLah — Complete System Architecture Blueprint

## System Architecture (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                             │
│  Next.js 14 App Router + TailwindCSS + Zustand                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Catstagram│ │CatFinder │ │Memorial  │ │ Service Worker   │   │
│  │  Feed    │ │  Map     │ │ Garden   │ │ (Cache/Sync/Push)│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │  Auth    │ │ Profile  │ │ Explore  │                        │
│  │  System  │ │ System   │ │ Trending │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API + JWT Auth
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                   │
│                    (Nginx / Cloudflare)                          │
│                    Rate Limiting: 100 req/15min/IP               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express + TypeScript)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth     │ │ Posts    │ │ LostCats │ │ Memorials        │   │
│  │ JWT+     │ │ CRUD     │ │ PostGIS  │ │ SSR + ISR        │   │
│  │ bcrypt   │ │ + Likes  │ │ + Push   │ │ + Tributes       │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Users    │ │ Payments │ │ AI Match │ │ Notifications    │   │
│  │ Profile+ │ │ Stripe   │ │ CNN      │ │ Web Push API     │   │
│  │ Follow   │ │ Boosts   │ │ Features │ │ + VAPID          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────┬──────────────┬──────────────┬─────────────────────────────┘
      │              │              │
      ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│PostgreSQL│  │  Redis   │  │ S3 (Cloudflare│
│ + PostGIS│  │ (Cache/  │  │  R2 / MinIO)  │
│ 16 tables│  │  Queue)  │  │  Media CDN    │
└──────────┘  └──────────┘  └──────────────┘
```

## Tech Stack Justification

### Backend: Node.js + Express (chosen over FastAPI)

**Reasons:**
1. **Unified language** — TypeScript across frontend and backend reduces context switching
2. **Ecosystem** — Mature libraries for JWT, image processing (sharp), S3 uploads (aws-sdk), web push
3. **Real-time** — Native WebSocket support via Socket.io for live notifications
4. **Deployment** — Railway/Render have first-class Node.js support
5. **Team scalability** — Larger hiring pool for JS/TS developers in Malaysia

**Trade-off:** FastAPI would offer better performance for CPU-bound AI matching tasks. For that specific module, we recommend a separate Python microservice if the AI matching workload grows.

### Database: PostgreSQL

- PostGIS extension for geolocation queries (CatFinder nearby search)
- JSONB columns for flexible metadata (cat traits, memorial gallery, notification data)
- Full-text search for posts and memorials
- Strong ACID compliance for payment transactions

### Frontend: Next.js 14 App Router

- Server-side rendering for SEO (memorial pages are shareable)
- App Router for nested layouts (memorial garden, feed, map views)
- Static generation for memorial pages (ISR for performance)
- Built-in image optimization with next/image

## Full Backend API Contract

### Authentication (`/v1/auth`)
| Method | Endpoint      | Auth  | Description                    |
|--------|---------------|-------|--------------------------------|
| POST   | /register     | No    | Create account (email+password)|
| POST   | /login        | No    | Login, returns JWT + refresh   |
| POST   | /logout       | Yes   | Clear push subscription        |
| POST   | /refresh      | No    | Rotate JWT using refresh token |
| GET    | /me           | Yes   | Get current user with counts   |

### Users (`/v1/users`)
| Method | Endpoint                | Auth     | Description                    |
|--------|-------------------------|----------|--------------------------------|
| GET    | /me                     | Yes      | Full profile with cats         |
| PUT    | /me                     | Yes      | Update profile fields          |
| PUT    | /me/avatar              | Yes      | Upload avatar image            |
| PUT    | /me/push-subscription   | Yes      | Save push subscription         |
| PUT    | /me/location            | Yes      | Update geolocation             |
| POST   | /me/cats                | Yes      | Add cat to profile             |
| GET    | /me/cats                | Yes      | List owned cats                |
| GET    | /me/lost-cats           | Yes      | My lost cat reports            |
| GET    | /me/memorials           | Yes      | My memorials                   |
| GET    | /:username              | Optional | Public profile                 |
| GET    | /:username/posts        | Optional | User's posts with pagination   |
| POST   | /:id/follow             | Yes      | Follow user                    |
| DELETE | /:id/follow             | Yes      | Unfollow user                  |

### Posts (`/v1/posts`)
| Method | Endpoint         | Auth     | Description                    |
|--------|------------------|----------|--------------------------------|
| GET    | /                | Optional | Feed (personalized if auth)    |
| POST   | /                | Yes      | Create post (multipart)        |
| GET    | /explore         | Optional | Trending posts (7-day window)  |
| GET    | /:id             | Optional | Single post with comments      |
| PUT    | /:id             | Yes      | Update caption/hashtags        |
| DELETE | /:id             | Yes      | Delete own post + S3 cleanup   |
| POST   | /:id/like        | Yes      | Like post + notification       |
| DELETE | /:id/like        | Yes      | Unlike post                    |
| GET    | /:id/comments    | No       | List comments                  |
| POST   | /:id/comments    | Yes      | Add comment + notification     |

### Lost Cats (`/v1/lost-cats`)
| Method | Endpoint         | Auth     | Description                    |
|--------|------------------|----------|--------------------------------|
| GET    | /                | Optional | List active reports            |
| POST   | /                | Yes      | Report lost cat + push nearby  |
| GET    | /nearby          | No       | PostGIS radius search          |
| GET    | /:id             | No       | Detail with sightings          |
| PUT    | /:id             | Yes      | Edit own report                |
| DELETE | /:id             | Yes      | Delete own report + S3 cleanup |
| PUT    | /:id/status      | Yes      | Update status (found/closed)   |
| POST   | /:id/sightings   | Yes      | Report sighting + push owner   |

### Found Cats (`/v1/found-cats`)
| Method | Endpoint         | Auth     | Description                    |
|--------|------------------|----------|--------------------------------|
| GET    | /                | No       | List found cats                |
| POST   | /                | Yes      | Report found cat (multipart)   |

### Memorials (`/v1/memorials`)
| Method | Endpoint              | Auth     | Description                    |
|--------|-----------------------|----------|--------------------------------|
| GET    | /                     | No       | List public memorials          |
| POST   | /                     | Yes      | Create memorial                |
| GET    | /wall                 | No       | Memorial wall gallery          |
| GET    | /:slug                | No       | Memorial page (SSR/SEO)        |
| POST   | /:id/tributes         | Yes      | Add candle/flower/heart        |
| POST   | /:id/condolences      | Yes      | Add condolence message         |

### Notifications (`/v1/notifications`)
| Method | Endpoint         | Auth | Description                    |
|--------|------------------|------|--------------------------------|
| GET    | /                | Yes  | Paginated notifications        |
| PUT    | /:id/read        | Yes  | Mark as read                   |
| PUT    | /read-all        | Yes  | Mark all as read               |

### Payments (`/v1/payments`)
| Method | Endpoint              | Auth | Description                    |
|--------|-----------------------|------|--------------------------------|
| POST   | /create-checkout      | Yes  | Create Stripe checkout session |
| POST   | /webhook              | No   | Stripe webhook (raw body)      |
| GET    | /history              | Yes  | Payment history                |

### Boosts (`/v1/boosts`)
| Method | Endpoint              | Auth | Description                    |
|--------|-----------------------|------|--------------------------------|
| POST   | /                     | Yes  | Create boost (pending payment) |
| POST   | /activate             | Yes  | Activate boost after payment   |
| GET    | /me                   | Yes  | My active boosts               |
| POST   | /subscriptions        | Yes  | Subscribe to premium           |

## Frontend File Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                      # Root layout (PWA meta, providers)
│   ├── page.tsx                        # Redirects to /feed
│   ├── (auth)/
│   │   ├── login/page.tsx              # Login page
│   │   └── register/page.tsx           # Register page
│   ├── feed/
│   │   ├── page.tsx                    # Catstagram feed (infinite scroll)
│   │   └── create/page.tsx             # Create new post
│   ├── explore/
│   │   └── page.tsx                    # Trending posts grid
│   ├── profile/
│   │   ├── page.tsx                    # Own profile (redirects)
│   │   ├── [username]/page.tsx         # Public profile view
│   │   └── edit/page.tsx               # Edit profile form
│   ├── lost-cats/
│   │   ├── page.tsx                    # CatFinder (map + list)
│   │   └── new/page.tsx                # Report lost cat form
│   ├── memorial/
│   │   ├── create/page.tsx             # Create memorial form
│   │   └── [slug]/page.tsx             # Memorial detail (SSR)
│   └── memorial-wall/
│       └── page.tsx                    # Public memorial gallery
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx               # Login form component
│   │   └── RegisterForm.tsx            # Register form component
│   ├── feed/
│   │   ├── CatFeedCard.tsx             # Post card (carousel, likes)
│   │   └── CreatePostForm.tsx          # Post creation form
│   ├── profile/
│   │   ├── AvatarUploader.tsx          # Avatar upload with preview
│   │   └── EditProfileForm.tsx         # Profile edit form
│   ├── layout/
│   │   ├── BottomNav.tsx               # Mobile bottom navigation
│   │   ├── Providers.tsx               # QueryClient + Zustand + toast
│   │   └── ServiceWorkerRegistrar.tsx  # SW registration + offline
│   ├── install/
│   │   └── InstallPrompt.tsx           # PWA install modal
│   ├── map/
│   │   └── MapView.tsx                 # Leaflet map component
│   ├── memorial/
│   │   ├── MemorialCreateForm.tsx      # Memorial creation form
│   │   ├── MemorialPage.tsx            # Memorial detail view
│   │   └── MemorialWall.tsx            # Memorial gallery grid
│   └── ui/
│       └── OfflineBanner.tsx           # Offline status indicator
├── store/
│   ├── auth-store.ts                   # Zustand auth state
│   └── feed-store.ts                   # Zustand feed state
├── hooks/
│   ├── use-online-status.ts            # Online/offline hook
│   └── use-push-notifications.ts       # Push subscription hook
├── lib/
│   ├── api.ts                          # Axios client with JWT
│   └── offline-queue.ts               # IndexedDB sync queue
└── types/
    └── index.ts                        # TypeScript interfaces
```

## Data Flow Diagrams

### Authentication Flow
```
User → LoginForm → auth-store.login() → POST /v1/auth/login
  → bcrypt.compare(password, hash)
  → Generate JWT (15min) + Refresh Token (7 days)
  → Store tokens in localStorage
  → Redirect to /feed

Token Refresh (on 401):
  api interceptor → POST /v1/auth/refresh (with refresh_token)
  → Verify refresh token → Generate new pair → Retry original request
```

### Post Creation Flow
```
User → CreatePostForm → Select photos → Write caption
  → Upload: FormData { media[], caption, hashtags, location }
  → POST /v1/posts (requireAuth)
  → Multer extracts files → Sharp optimizes to WebP
  → S3.putObject (parallel uploads)
  → prisma.post.create()
  → Invalidate Redis feed cache
  → Return post with author
```

### Lost Cat Report Flow
```
User → LostCatForm → Photos + details + last-seen location
  → POST /v1/lost-cats (requireAuth)
  → Upload photos to S3
  → prisma.lostCat.create()
  → notifyNearbyUsers():
    → PostGIS: Find users within 10km radius
    → Web Push: Send "Lost cat near you" notification
  → Return report + notification count
```

### Memorial Page Flow
```
User → MemorialCreateForm → Cat info + photos + life story
  → POST /v1/memorials (requireAuth)
  → Generate unique slug (cat-name-hash)
  → Upload photos to S3
  → prisma.memorial.create()
  → Next.js ISR: Pre-render /memorial/[slug]
  → Service Worker: Cache memorial for offline viewing
```

### Offline Sync Flow
```
User goes offline → Service Worker intercepts failed POST
  → IndexedDB.put('sync-queue', { url, method, body })
  → navigator.serviceWorker.sync.register('meowlah-sync')

User comes online → Service Worker 'sync' event fires
  → Read all from IndexedDB sync-queue
  → Replay each request sequentially
  → On success: delete from queue, notify client
  → On failure: retry on next sync event
```

## Database Schema Summary

16 tables across 5 domains:

### Identity (3 tables)
- **users** — User accounts with auth, location, subscription status
- **cat_profiles** — User-owned cat profiles with traits
- **follows** — User follow relationships (composite PK)

### Social (4 tables)
- **posts** — Catstagram posts with media, hashtags, location
- **post_likes** — Like relationships (composite PK, prevents duplicates)
- **comments** — Threaded comments on posts and memorials

### CatFinder (3 tables)
- **lost_cats** — Lost cat reports with geolocation + PostGIS
- **found_cats** — Found cat reports with matching potential
- **cat_sightings** — Crowdsourced sightings linked to lost cats

### Memorial (3 tables)
- **memorials** — Memorial pages with themes, privacy, gallery
- **memorial_tributes** — Candles, flowers, hearts with animations
- **condolences** — Condolence messages from community

### Commerce (3 tables)
- **paid_boosts** — Boost transactions for posts/lost-cats
- **subscriptions** — Premium plans (monthly/yearly)
- **sponsored_listings** — Ad placements (CPC/CPM model)

## Security Considerations

1. **Authentication**: JWT with 15-min expiry + 7-day refresh tokens. bcrypt(12) for password hashing.
2. **Authorization**: `requireAuth` middleware on all write endpoints. Ownership checks on PUT/DELETE.
3. **Input Validation**: Zod schemas on all request bodies. Parameterized queries via Prisma (SQL injection safe).
4. **File Uploads**: MIME type whitelist (images + video only). 50MB per file limit. Server-side image optimization.
5. **Rate Limiting**: 100 requests per 15 minutes per IP. Stricter limits on auth endpoints.
6. **Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
7. **CORS**: Explicit origin allowlist (frontend URL only).
8. **Secrets**: Environment variables, never committed. `.env.example` files provided.

## Deployment Instructions

### Frontend: Vercel
```bash
cd frontend
vercel --prod
# Or: Railway deployment with standalone output
```

### Backend: Railway
```bash
cd backend
railway up
# Requires: DATABASE_URL, REDIS_URL, JWT_SECRET, S3 credentials, VAPID keys
```

### Database: Railway PostgreSQL
```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Then run: npx prisma db push
```

### Environment Variables Required
```
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<random-256-bit>
JWT_REFRESH_SECRET=<random-256-bit>
S3_ENDPOINT=https://...
S3_BUCKET=meowlah-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL=https://cdn.meowlah.my
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://meowlah.my

# Frontend
NEXT_PUBLIC_API_URL=https://api.meowlah.my/v1
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-backend>
```
