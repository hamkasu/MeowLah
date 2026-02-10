# Scaling Strategy: 100K–500K Users

## Architecture Evolution

### Phase 1: Launch (0–50K users)
- **Single backend instance** on Railway/Render (2GB RAM)
- **Managed PostgreSQL** (Railway / Supabase / Neon)
- **Redis** (Upstash or Railway add-on)
- **Cloudflare R2** for media storage (free egress)
- **Vercel** for frontend (edge CDN included)
- **Estimated cost:** $20–50/month

### Phase 2: Growth (50K–200K users)
- **Horizontal scaling:** 2–4 backend instances behind load balancer
- **Database:** Migrate to dedicated PostgreSQL (e.g. AWS RDS / DigitalOcean Managed DB)
  - Add read replicas for feed queries and memorial page reads
  - Connection pooling via PgBouncer
- **Redis Cluster** for session cache + feed cache
- **CDN:** Cloudflare CDN in front of R2 for image delivery
- **Background jobs:** Add BullMQ (Redis-backed) for:
  - Push notification batching
  - AI matching queue
  - Image optimization pipeline
  - Boost expiry cleanup
- **Estimated cost:** $100–300/month

### Phase 3: Scale (200K–500K users)
- **Kubernetes** or managed containers (AWS ECS / Google Cloud Run)
- **Database sharding:** Separate databases for:
  - Users + Auth (write-heavy)
  - Posts + Feed (read-heavy, most queries)
  - Lost/Found cats (geospatial queries)
  - Memorials (read-heavy, cacheable)
- **AI Matching:** Dedicated GPU instance for the Python ML service
- **Search:** Elasticsearch/Meilisearch for full-text search across posts, memorials, lost cats
- **Monitoring:** Grafana + Prometheus, Sentry for error tracking
- **Estimated cost:** $500–1500/month

## Key Bottlenecks & Solutions

### 1. Feed Generation (most expensive query)
**Problem:** Fan-out on read — fetching posts from all followed users.
**Solutions:**
- **Cache feeds** in Redis (TTL: 60 seconds per user)
- **Materialized timeline:** Pre-compute feeds using background workers (fan-out on write)
- **Cursor-based pagination** instead of offset pagination

### 2. Geospatial Queries (CatFinder)
**Problem:** ST_DWithin queries get expensive at scale.
**Solutions:**
- **PostGIS spatial indexes** (already included in schema)
- **Geohash-based sharding** for very large datasets
- **Cache nearby results** in Redis with geo commands (GEOADD/GEOSEARCH)

### 3. Image/Media Delivery
**Problem:** High bandwidth for images/videos.
**Solutions:**
- **Cloudflare R2 + CDN** (zero egress fees)
- **Image optimization:** Serve WebP/AVIF via Next.js Image Optimization
- **Responsive images:** Multiple sizes generated on upload (thumbnail, medium, full)
- **Lazy loading** on all non-critical images

### 4. Memorial Pages (SEO + caching)
**Problem:** Memorial pages need to be SEO-friendly and fast.
**Solutions:**
- **ISR (Incremental Static Regeneration)** via Next.js — revalidate every 60s
- **Redis cache** for memorial API responses (5-minute TTL)
- **Pre-cache memorial images** in service worker for emotional reliability
- **CDN caching** with long TTLs for memorial photo assets

### 5. Push Notifications
**Problem:** Sending thousands of notifications for a popular lost cat report.
**Solutions:**
- **Queue notifications** via BullMQ with rate limiting
- **Batch sends** (group by region, send in batches of 100)
- **Migrate to FCM/APNs** for native apps (more reliable than Web Push at scale)

## Database Optimization

```sql
-- Composite indexes for common queries
CREATE INDEX idx_posts_feed ON posts(author_id, created_at DESC) WHERE author_id IS NOT NULL;
CREATE INDEX idx_lost_cats_active_geo ON lost_cats USING GIST (
  ST_SetSRID(ST_MakePoint(last_seen_lng, last_seen_lat), 4326)
) WHERE status = 'active';
CREATE INDEX idx_memorials_wall ON memorials(created_at DESC) WHERE visibility = 'public' AND show_on_wall = true;

-- Materialized view for trending posts
CREATE MATERIALIZED VIEW trending_posts AS
SELECT p.*, (p.like_count * 2 + p.comment_count * 3) AS trending_score
FROM posts p
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY trending_score DESC
LIMIT 100;

-- Refresh every 15 minutes via cron job
```

## Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Sentry | Error tracking + performance monitoring |
| Grafana + Prometheus | Infrastructure metrics, API latency, DB query times |
| PostHog / Mixpanel | User analytics, feature adoption, funnel tracking |
| UptimeRobot | Uptime monitoring + alerts |
| Lighthouse CI | PWA score regression testing in CI/CD |
