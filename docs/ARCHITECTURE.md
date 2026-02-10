# Catstagram + CatFinder Malaysia — Architecture

## System Architecture (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                             │
│  Next.js 14 App Router + TailwindCSS + Zustand                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Catstagram│ │CatFinder │ │Memorial  │ │ Service Worker   │   │
│  │  Feed    │ │  Map     │ │ Garden   │ │ (Cache/Sync/Push)│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                   │
│                    (Nginx / Cloudflare)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth     │ │ Posts    │ │ LostCats │ │ Memorials        │   │
│  │ Module   │ │ Module   │ │ Module   │ │ Module           │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ Users    │ │ Payments │ │ AI Match │                        │
│  │ Module   │ │ Module   │ │ Module   │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────┬──────────────┬──────────────┬─────────────────────────────┘
      │              │              │
      ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│PostgreSQL│  │  Redis   │  │ S3 (MinIO/   │
│ (Main DB)│  │ (Cache/  │  │  Cloudflare  │
│          │  │  Queue)  │  │  R2)         │
└──────────┘  └──────────┘  └──────────────┘
```

## Tech Stack Justification

### Backend: Node.js + Express (chosen over FastAPI)

**Reasons:**
1. **Unified language** — JavaScript/TypeScript across frontend and backend reduces context switching.
2. **Ecosystem** — Mature libraries for JWT, image processing (sharp), S3 uploads (aws-sdk), and web push.
3. **Real-time** — Native WebSocket support via Socket.io for live notifications.
4. **Deployment** — Railway/Render have first-class Node.js support.
5. **Team scalability** — Larger hiring pool for JS/TS developers in Malaysia.

**Trade-off:** FastAPI would offer better performance for CPU-bound AI matching tasks. For that specific module, we recommend a separate Python microservice if the AI matching workload grows.

### Database: PostgreSQL

- PostGIS extension for geolocation queries (CatFinder sightings)
- JSONB columns for flexible metadata (cat traits, memorial gallery)
- Full-text search for posts and memorials
- Strong ACID compliance for payment transactions

### Frontend: Next.js 14 App Router

- Server-side rendering for SEO (memorial pages are shareable)
- App Router for nested layouts (memorial garden, feed, map views)
- Static generation for memorial pages (ISR for performance)
- Built-in image optimization

## Data Flow

1. **Post Creation:** Client → API → Validate → Upload media to S3 → Store metadata in PostgreSQL → Invalidate Redis cache → Return
2. **Lost Cat Report:** Client → API → Store in DB → Calculate nearby users via PostGIS → Push notifications via Web Push → Return
3. **Memorial Creation:** Client → API → Store in DB → Generate SEO slug → Pre-render page via ISR → Return shareable URL
4. **AI Match:** Lost cat photo → Feature extraction (CNN) → Compare against found cats DB → Return similarity scores
5. **Offline Flow:** Client → Service Worker intercepts → Queue in IndexedDB → Background sync when online → API
