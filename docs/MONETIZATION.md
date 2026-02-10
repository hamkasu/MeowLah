# Monetization Strategy

## Revenue Streams

### 1. Boosted Lost-Cat Posts (Primary)
**Target:** Users with missing cats willing to pay for wider reach.

| Duration | Price (MYR) | Reach |
|----------|------------|-------|
| 24 hours | RM 36 | 3x visibility, priority in list + map |
| 48 hours | RM 60 | 3x visibility + push to users within 20km |
| 7 days | RM 150 | Max visibility + featured banner |

**Implementation:** `paid_boosts` table + `is_boosted` flag on `lost_cats`.
Boosted posts appear first in list view and have a larger marker on the map.

### 2. Premium Subscription (MeowLah Pro)
**Target:** Power users, cat rescuers, breeders, and memorial page creators.

| Plan | Price | Features |
|------|-------|----------|
| Monthly | RM 9.90/mo | Premium themes, unlimited memorials, analytics, verified badge priority |
| Yearly | RM 99/yr | All monthly features + featured on memorial wall |

**Premium features:**
- Starlight and Ocean memorial themes
- Unlimited memorial gallery photos (free: 10 max)
- Post analytics (views, reach, engagement)
- Priority support
- Ad-free experience
- Export memorials as PDF

### 3. Boosted Catstagram Posts
**Target:** Cat influencers, breeders, pet shops.

| Duration | Price |
|----------|-------|
| 24 hours | RM 48 |
| 48 hours | RM 84 |

### 4. Sponsored Listings
**Target:** Pet shops, veterinary clinics, cat food brands.

**Placement options:**
- Feed (between posts)
- Sidebar (desktop)
- Memorial page footer (respectful, relevant ads only)
- Map view (sponsored pins for vet clinics)

**Pricing model:**
- CPC (cost per click): RM 0.30–1.00
- CPM (cost per 1000 impressions): RM 5.00–15.00

**Implementation:** `sponsored_listings` table with placement targeting.

### 5. Affiliate Products Page
**Target:** Cat product recommendations.

**Products:**
- Cat food (affiliate links to Shopee/Lazada)
- GPS cat trackers (high relevance for CatFinder users)
- Cat accessories and toys
- Pet insurance
- Veterinary services

**Revenue:** 3–8% commission per sale via affiliate programs.

## Payment Providers (Malaysia)

| Provider | Supported | Use Case |
|----------|-----------|----------|
| Stripe | Credit/debit cards | International payments |
| Billplz | FPX, e-wallets | Malaysian bank transfers |
| ToyyibPay | FPX, e-wallets | Budget-friendly Malaysian payments |
| GrabPay | E-wallet | Mobile payments |

**Recommended:** Start with Stripe (cards) + Billplz (FPX) for Malaysian market coverage.

## Revenue Projections

| Users | Monthly Revenue (Conservative) |
|-------|-------------------------------|
| 10K | RM 3,000–5,000 |
| 50K | RM 15,000–30,000 |
| 100K | RM 40,000–80,000 |
| 500K | RM 200,000–500,000 |

Assumes 2% premium conversion, 5% boost purchase rate, and growing sponsored listing revenue.
