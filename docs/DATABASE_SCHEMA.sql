-- ============================================================================
-- MeowLah — Complete PostgreSQL Database Schema
-- Generated from Prisma schema (backend/prisma/schema.prisma)
-- ============================================================================
-- This schema defines all 16 tables for the MeowLah cat social platform:
--   users, cat_profiles, posts, post_likes, comments, follows,
--   lost_cats, found_cats, cat_sightings, memorials, memorial_tributes,
--   condolences, paid_boosts, subscriptions, notifications, sponsored_listings
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- PostGIS: geospatial queries for lost/found cats, sightings, nearby users
CREATE EXTENSION IF NOT EXISTS postgis;

-- uuid-ossp: UUID v4 generation for all primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. users
-- Core user accounts. Supports regular users, verified rescuers, and
-- premium subscribers. The is_verified_rescuer column provides role-based
-- support — verified rescuers receive a badge and priority in lost/found feeds.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                 VARCHAR(255) NOT NULL UNIQUE,
    username              VARCHAR(50)  NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    display_name          VARCHAR(100),
    avatar_url            TEXT,
    bio                   TEXT,
    location_lat          DOUBLE PRECISION,
    location_lng          DOUBLE PRECISION,
    location_city         VARCHAR(100),
    is_verified_rescuer   BOOLEAN      NOT NULL DEFAULT FALSE,  -- Role support: verified animal rescuer badge
    is_premium            BOOLEAN      NOT NULL DEFAULT FALSE,
    push_subscription     JSONB,                                -- Web Push subscription object
    notification_radius_km INT        NOT NULL DEFAULT 10,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users IS 'Core user accounts — regular users, verified rescuers, and premium subscribers.';
COMMENT ON COLUMN users.is_verified_rescuer IS 'Role support: when TRUE, user has been verified as an animal rescuer and receives a badge.';
COMMENT ON COLUMN users.push_subscription IS 'JSONB Web Push subscription object for push notifications.';

-- ---------------------------------------------------------------------------
-- 2. cat_profiles
-- User-owned cat profiles. Each user can register multiple cats with
-- breed, color, traits (JSONB), and photos. Linked to posts and lost reports.
-- ---------------------------------------------------------------------------
CREATE TABLE cat_profiles (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    breed         VARCHAR(100),
    color         VARCHAR(100),
    age_years     INT,
    age_months    INT,
    gender        VARCHAR(20),
    is_neutered   BOOLEAN,
    photo_url     TEXT,
    description   TEXT,
    traits        JSONB,           -- Flexible key-value traits (e.g. {"indoor": true, "friendly": true})
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_profiles_owner_id ON cat_profiles(owner_id);

COMMENT ON TABLE  cat_profiles IS 'User-owned cat profiles with breed, traits, and photos.';
COMMENT ON COLUMN cat_profiles.traits IS 'JSONB flexible traits (e.g. {"indoor": true, "friendly": true}).';

-- ---------------------------------------------------------------------------
-- 3. posts
-- Cat content feed — photos, videos, stories. Supports hashtags, location
-- tagging, optional cat profile linking, and paid boosting.
-- ---------------------------------------------------------------------------
CREATE TABLE posts (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_profile_id   UUID         REFERENCES cat_profiles(id) ON DELETE SET NULL,
    caption          TEXT,
    media_urls       TEXT[]       NOT NULL DEFAULT '{}',       -- Array of media URLs (photos/videos)
    media_type       VARCHAR(20)  NOT NULL DEFAULT 'image',
    hashtags         TEXT[]       NOT NULL DEFAULT '{}',       -- Array of hashtag strings
    location_name    VARCHAR(200),
    location_lat     DOUBLE PRECISION,
    location_lng     DOUBLE PRECISION,
    like_count       INT          NOT NULL DEFAULT 0,
    comment_count    INT          NOT NULL DEFAULT 0,
    is_boosted       BOOLEAN      NOT NULL DEFAULT FALSE,
    boost_expires_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author_id  ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

COMMENT ON TABLE  posts IS 'Cat content feed — photos, videos, stories with hashtags, location, and boost support.';
COMMENT ON COLUMN posts.media_urls IS 'TEXT[] array of media URLs (photos/videos).';
COMMENT ON COLUMN posts.hashtags IS 'TEXT[] array of hashtag strings for discovery.';

-- ---------------------------------------------------------------------------
-- 4. post_likes
-- Many-to-many join table for users liking posts.
-- Composite primary key (user_id, post_id) prevents duplicate likes.
-- ---------------------------------------------------------------------------
CREATE TABLE post_likes (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, post_id)
);

COMMENT ON TABLE post_likes IS 'Many-to-many: users liking posts. Composite PK (user_id, post_id) prevents duplicates.';

-- ---------------------------------------------------------------------------
-- 5. comments
-- Comments on posts and memorials, with optional threaded replies via
-- parent_id self-reference. Deleting a parent cascades to all replies.
-- ---------------------------------------------------------------------------
CREATE TABLE comments (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id     UUID        REFERENCES posts(id) ON DELETE CASCADE,
    memorial_id UUID,       -- FK added after memorials table is created
    parent_id   UUID        REFERENCES comments(id) ON DELETE CASCADE,
    body        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id     ON comments(post_id);
CREATE INDEX idx_comments_memorial_id ON comments(memorial_id);

COMMENT ON TABLE  comments IS 'Comments on posts and memorials with threaded replies via parent_id self-reference.';
COMMENT ON COLUMN comments.parent_id IS 'Self-referencing FK for threaded replies. ON DELETE CASCADE removes all child replies.';

-- ---------------------------------------------------------------------------
-- 6. follows
-- User-to-user follow relationships. Composite primary key
-- (follower_id, following_id) prevents duplicate follows.
-- ---------------------------------------------------------------------------
CREATE TABLE follows (
    follower_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following_id ON follows(following_id);

COMMENT ON TABLE follows IS 'User-to-user follow relationships. Composite PK (follower_id, following_id) prevents duplicates.';

-- ---------------------------------------------------------------------------
-- 7. lost_cats
-- Lost cat reports with last-seen location, photos, contact info, optional
-- reward, and AI feature vector for visual matching against found cats.
-- ---------------------------------------------------------------------------
CREATE TABLE lost_cats (
    id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_profile_id    UUID           REFERENCES cat_profiles(id) ON DELETE SET NULL,
    name              VARCHAR(100)   NOT NULL,
    breed             VARCHAR(100),
    color             VARCHAR(100),
    description       TEXT           NOT NULL,
    photo_urls        TEXT[]         NOT NULL DEFAULT '{}',    -- Array of photo URLs
    last_seen_lat     DOUBLE PRECISION NOT NULL,
    last_seen_lng     DOUBLE PRECISION NOT NULL,
    last_seen_address TEXT,
    last_seen_at      TIMESTAMPTZ,
    contact_phone     VARCHAR(20),
    contact_whatsapp  VARCHAR(20),
    reward_amount     DECIMAL(10,2),
    status            VARCHAR(20)    NOT NULL DEFAULT 'active',
    is_boosted        BOOLEAN        NOT NULL DEFAULT FALSE,
    boost_expires_at  TIMESTAMPTZ,
    feature_vector    JSONB,                                   -- AI feature vector for visual cat matching
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lost_cats_reporter_id ON lost_cats(reporter_id);
CREATE INDEX idx_lost_cats_status      ON lost_cats(status);

COMMENT ON TABLE  lost_cats IS 'Lost cat reports with location, photos, contact info, reward, and AI feature vector for matching.';
COMMENT ON COLUMN lost_cats.photo_urls IS 'TEXT[] array of photo URLs for the lost cat.';
COMMENT ON COLUMN lost_cats.feature_vector IS 'JSONB AI feature vector for visual matching against found cats.';
COMMENT ON COLUMN lost_cats.reward_amount IS 'DECIMAL(10,2) optional reward in MYR offered for finding the cat.';

-- ---------------------------------------------------------------------------
-- 8. found_cats
-- Found cat reports with location, photos, and optional match to a lost cat.
-- Includes AI feature vector for automated matching.
-- ---------------------------------------------------------------------------
CREATE TABLE found_cats (
    id                 UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id        UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description        TEXT           NOT NULL,
    photo_urls         TEXT[]         NOT NULL DEFAULT '{}',   -- Array of photo URLs
    found_lat          DOUBLE PRECISION NOT NULL,
    found_lng          DOUBLE PRECISION NOT NULL,
    found_address      TEXT,
    found_at           TIMESTAMPTZ,
    contact_phone      VARCHAR(20),
    status             VARCHAR(20)    NOT NULL DEFAULT 'active',
    feature_vector     JSONB,                                  -- AI feature vector for visual cat matching
    matched_lost_cat_id UUID         REFERENCES lost_cats(id),
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_found_cats_reporter_id ON found_cats(reporter_id);
CREATE INDEX idx_found_cats_status      ON found_cats(status);

COMMENT ON TABLE  found_cats IS 'Found cat reports with location, photos, and optional match to a lost_cats record.';
COMMENT ON COLUMN found_cats.feature_vector IS 'JSONB AI feature vector for visual matching against lost cats.';

-- ---------------------------------------------------------------------------
-- 9. cat_sightings
-- Community-reported sightings of a specific lost cat. Each sighting
-- includes a GPS location, optional photo, and note from the reporter.
-- ---------------------------------------------------------------------------
CREATE TABLE cat_sightings (
    id          UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_cat_id UUID             NOT NULL REFERENCES lost_cats(id) ON DELETE CASCADE,
    reporter_id UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    address     TEXT,
    note        TEXT,
    photo_url   TEXT,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_sightings_lost_cat_id ON cat_sightings(lost_cat_id);

COMMENT ON TABLE cat_sightings IS 'Community-reported sightings of a lost cat with GPS location and optional photo.';

-- ---------------------------------------------------------------------------
-- 10. memorials
-- In-memory pages for cats that have passed. Includes life story,
-- gallery, themed display, and counters for candles/flowers.
-- ---------------------------------------------------------------------------
CREATE TABLE memorials (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug             VARCHAR(200) NOT NULL UNIQUE,
    creator_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_profile_id   UUID,        -- Optional link to cat_profiles (not FK-constrained for flexibility)
    cat_name         VARCHAR(100) NOT NULL,
    cat_breed        VARCHAR(100),
    cat_color        VARCHAR(100),
    cat_photo_url    TEXT,
    date_of_birth    DATE,
    date_of_passing  DATE,
    age_text         VARCHAR(100),
    life_story       TEXT,
    gallery_urls     TEXT[]       NOT NULL DEFAULT '{}',   -- Array of gallery photo URLs
    visibility       VARCHAR(20)  NOT NULL DEFAULT 'public',
    theme            VARCHAR(50)  NOT NULL DEFAULT 'default',
    is_premium_theme BOOLEAN      NOT NULL DEFAULT FALSE,
    candle_count     INT          NOT NULL DEFAULT 0,
    flower_count     INT          NOT NULL DEFAULT 0,
    show_on_wall     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memorials_creator_id ON memorials(creator_id);
CREATE INDEX idx_memorials_slug       ON memorials(slug);
CREATE INDEX idx_memorials_visibility ON memorials(visibility);

COMMENT ON TABLE  memorials IS 'In-memory pages for deceased cats with life story, gallery, themed display, and tribute counters.';
COMMENT ON COLUMN memorials.gallery_urls IS 'TEXT[] array of gallery photo URLs.';

-- ---------------------------------------------------------------------------
-- Add deferred FK from comments.memorial_id -> memorials.id
-- (memorials table must exist before this constraint can be created)
-- ---------------------------------------------------------------------------
ALTER TABLE comments
    ADD CONSTRAINT fk_comments_memorial_id
    FOREIGN KEY (memorial_id) REFERENCES memorials(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 11. memorial_tributes
-- Virtual tributes (candles, flowers, etc.) left on memorials by users.
-- ---------------------------------------------------------------------------
CREATE TABLE memorial_tributes (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    memorial_id  UUID        NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tribute_type VARCHAR(20) NOT NULL,   -- e.g. 'candle', 'flower', 'heart'
    message      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memorial_tributes_memorial_id ON memorial_tributes(memorial_id);

COMMENT ON TABLE  memorial_tributes IS 'Virtual tributes (candles, flowers, etc.) left on memorials by users.';
COMMENT ON COLUMN memorial_tributes.tribute_type IS 'Type of tribute: candle, flower, heart, etc.';

-- ---------------------------------------------------------------------------
-- 12. condolences
-- Text condolence messages left on memorials by users.
-- ---------------------------------------------------------------------------
CREATE TABLE condolences (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    memorial_id UUID        NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_condolences_memorial_id ON condolences(memorial_id);

COMMENT ON TABLE condolences IS 'Text condolence messages left on memorials by community members.';

-- ---------------------------------------------------------------------------
-- 13. paid_boosts
-- Paid boost records for promoting posts and lost-cat reports. Tracks
-- payment status, provider, duration, and activation window.
-- ---------------------------------------------------------------------------
CREATE TABLE paid_boosts (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type       VARCHAR(20)   NOT NULL,    -- 'post', 'lost_cat', 'memorial'
    target_id         UUID          NOT NULL,
    amount            DECIMAL(10,2) NOT NULL,
    currency          VARCHAR(3)    NOT NULL DEFAULT 'MYR',
    duration_hours    INT           NOT NULL,
    payment_status    VARCHAR(20)   NOT NULL DEFAULT 'pending',   -- pending, paid, failed, refunded
    payment_provider  VARCHAR(50),                                -- e.g. 'stripe'
    payment_reference VARCHAR(255),                               -- External payment ID
    starts_at         TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paid_boosts_user_id    ON paid_boosts(user_id);
CREATE INDEX idx_paid_boosts_target     ON paid_boosts(target_type, target_id);

COMMENT ON TABLE  paid_boosts IS 'Paid boost records for promoting posts and lost-cat reports via Stripe payments.';
COMMENT ON COLUMN paid_boosts.target_type IS 'Polymorphic target: post, lost_cat, or memorial.';
COMMENT ON COLUMN paid_boosts.amount IS 'DECIMAL(10,2) payment amount in the specified currency.';

-- ---------------------------------------------------------------------------
-- 14. subscriptions
-- Premium subscription records. Tracks plan, billing cycle, payment
-- provider, and auto-renewal status.
-- ---------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan              VARCHAR(50)   NOT NULL,      -- 'monthly', 'yearly'
    status            VARCHAR(20)   NOT NULL DEFAULT 'active',   -- active, cancelled, expired
    amount            DECIMAL(10,2) NOT NULL,
    currency          VARCHAR(3)    NOT NULL DEFAULT 'MYR',
    payment_provider  VARCHAR(50),                 -- e.g. 'stripe'
    payment_reference VARCHAR(255),                -- Stripe subscription ID
    starts_at         TIMESTAMPTZ   NOT NULL,
    expires_at        TIMESTAMPTZ   NOT NULL,
    auto_renew        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status  ON subscriptions(status);

COMMENT ON TABLE  subscriptions IS 'Premium subscription records with plan, billing, and auto-renewal tracking.';
COMMENT ON COLUMN subscriptions.amount IS 'DECIMAL(10,2) subscription price in the specified currency.';

-- ---------------------------------------------------------------------------
-- 15. notifications
-- User notifications (likes, comments, follows, sightings, system alerts).
-- Stores flexible data payload as JSONB for different notification types.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,      -- e.g. 'like', 'comment', 'follow', 'sighting', 'system'
    title      VARCHAR(200),
    body       TEXT,
    data       JSONB,                     -- Flexible payload (e.g. {"post_id": "...", "actor_id": "..."})
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created   ON notifications(created_at DESC);

COMMENT ON TABLE  notifications IS 'User notifications for likes, comments, follows, sightings, and system alerts.';
COMMENT ON COLUMN notifications.data IS 'JSONB flexible payload (e.g. {"post_id": "...", "actor_id": "..."}).';

-- ---------------------------------------------------------------------------
-- 16. sponsored_listings
-- Paid advertising placements. Supports CPC and CPM pricing models with
-- impression/click tracking and optional scheduling.
-- ---------------------------------------------------------------------------
CREATE TABLE sponsored_listings (
    id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_name  VARCHAR(200)   NOT NULL,
    title            VARCHAR(200)   NOT NULL,
    description      TEXT,
    image_url        TEXT,
    link_url         TEXT           NOT NULL,
    placement        VARCHAR(50)    NOT NULL,    -- e.g. 'feed', 'sidebar', 'lost_cats'
    cpc_amount       DECIMAL(10,4),              -- Cost per click
    cpm_amount       DECIMAL(10,4),              -- Cost per mille (1000 impressions)
    impression_count INT            NOT NULL DEFAULT 0,
    click_count      INT            NOT NULL DEFAULT 0,
    is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
    starts_at        TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  sponsored_listings IS 'Paid advertising placements with CPC/CPM pricing and impression/click tracking.';
COMMENT ON COLUMN sponsored_listings.cpc_amount IS 'DECIMAL(10,4) cost per click.';
COMMENT ON COLUMN sponsored_listings.cpm_amount IS 'DECIMAL(10,4) cost per mille (1000 impressions).';
COMMENT ON COLUMN sponsored_listings.placement IS 'Ad placement location: feed, sidebar, lost_cats, etc.';
