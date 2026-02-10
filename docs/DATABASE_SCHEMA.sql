-- ============================================================
-- Catstagram + CatFinder Malaysia — Full Database Schema
-- PostgreSQL with PostGIS extension
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_city VARCHAR(100),
    is_verified_rescuer BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    push_subscription JSONB,            -- Web Push subscription object
    notification_radius_km INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users USING GIST (
    ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
);

-- ============================================================
-- CAT PROFILES
-- ============================================================
CREATE TABLE cat_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    color VARCHAR(100),
    age_years INTEGER,
    age_months INTEGER,
    gender VARCHAR(20),
    is_neutered BOOLEAN,
    photo_url TEXT,
    description TEXT,
    traits JSONB,                       -- e.g. {"friendly": true, "indoor": false}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cat_profiles_owner ON cat_profiles(owner_id);

-- ============================================================
-- POSTS (Catstagram)
-- ============================================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_profile_id UUID REFERENCES cat_profiles(id) ON DELETE SET NULL,
    caption TEXT,
    media_urls TEXT[] NOT NULL,          -- Array of S3 URLs
    media_type VARCHAR(20) DEFAULT 'image', -- 'image' | 'video'
    hashtags TEXT[],
    location_name VARCHAR(200),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_boosted BOOLEAN DEFAULT FALSE,
    boost_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX idx_posts_boosted ON posts(is_boosted, boost_expires_at) WHERE is_boosted = TRUE;

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE post_likes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- COMMENTS (shared for Posts & Memorials)
-- ============================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    memorial_id UUID,                    -- FK added after memorials table
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_memorial ON comments(memorial_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- LOST CATS
-- ============================================================
CREATE TABLE lost_cats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_profile_id UUID REFERENCES cat_profiles(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    color VARCHAR(100),
    description TEXT NOT NULL,
    photo_urls TEXT[] NOT NULL,
    last_seen_lat DOUBLE PRECISION NOT NULL,
    last_seen_lng DOUBLE PRECISION NOT NULL,
    last_seen_address TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    contact_phone VARCHAR(20),
    contact_whatsapp VARCHAR(20),
    reward_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',  -- 'active' | 'found' | 'closed'
    is_boosted BOOLEAN DEFAULT FALSE,
    boost_expires_at TIMESTAMP WITH TIME ZONE,
    -- AI feature embedding stored as vector (for similarity matching)
    feature_vector JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lost_cats_reporter ON lost_cats(reporter_id);
CREATE INDEX idx_lost_cats_status ON lost_cats(status);
CREATE INDEX idx_lost_cats_location ON lost_cats USING GIST (
    ST_SetSRID(ST_MakePoint(last_seen_lng, last_seen_lat), 4326)
);

-- ============================================================
-- FOUND CATS
-- ============================================================
CREATE TABLE found_cats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    photo_urls TEXT[] NOT NULL,
    found_lat DOUBLE PRECISION NOT NULL,
    found_lng DOUBLE PRECISION NOT NULL,
    found_address TEXT,
    found_at TIMESTAMP WITH TIME ZONE,
    contact_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',  -- 'active' | 'claimed' | 'closed'
    feature_vector JSONB,
    matched_lost_cat_id UUID REFERENCES lost_cats(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_found_cats_reporter ON found_cats(reporter_id);
CREATE INDEX idx_found_cats_status ON found_cats(status);
CREATE INDEX idx_found_cats_location ON found_cats USING GIST (
    ST_SetSRID(ST_MakePoint(found_lng, found_lat), 4326)
);

-- ============================================================
-- CAT SIGHTINGS (community reports on map)
-- ============================================================
CREATE TABLE cat_sightings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_cat_id UUID NOT NULL REFERENCES lost_cats(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    address TEXT,
    note TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sightings_lost_cat ON cat_sightings(lost_cat_id);

-- ============================================================
-- MEMORIALS (Cat Memorial Garden)
-- ============================================================
CREATE TABLE memorials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(200) UNIQUE NOT NULL,   -- SEO-friendly URL slug
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_profile_id UUID REFERENCES cat_profiles(id) ON DELETE SET NULL,
    cat_name VARCHAR(100) NOT NULL,
    cat_breed VARCHAR(100),
    cat_color VARCHAR(100),
    cat_photo_url TEXT,
    date_of_birth DATE,
    date_of_passing DATE,
    age_text VARCHAR(100),               -- "3 years, 2 months" (computed or user-entered)
    life_story TEXT,                      -- Main tribute text
    gallery_urls TEXT[],                  -- Array of memorial photo URLs
    visibility VARCHAR(20) DEFAULT 'public',  -- 'public' | 'private' | 'friends'
    theme VARCHAR(50) DEFAULT 'default',      -- 'default' | 'garden' | 'starlight' | 'ocean'
    is_premium_theme BOOLEAN DEFAULT FALSE,
    candle_count INTEGER DEFAULT 0,
    flower_count INTEGER DEFAULT 0,
    -- For "In Loving Memory" global wall
    show_on_wall BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memorials_creator ON memorials(creator_id);
CREATE INDEX idx_memorials_slug ON memorials(slug);
CREATE INDEX idx_memorials_visibility ON memorials(visibility);
CREATE INDEX idx_memorials_wall ON memorials(show_on_wall) WHERE show_on_wall = TRUE;

-- Add FK for comments referencing memorials
ALTER TABLE comments
    ADD CONSTRAINT fk_comments_memorial
    FOREIGN KEY (memorial_id) REFERENCES memorials(id) ON DELETE CASCADE;

-- ============================================================
-- MEMORIAL TRIBUTES (candles, flowers)
-- ============================================================
CREATE TABLE memorial_tributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memorial_id UUID NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tribute_type VARCHAR(20) NOT NULL,    -- 'candle' | 'flower' | 'heart'
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tributes_memorial ON memorial_tributes(memorial_id);

-- ============================================================
-- CONDOLENCES (separate from general comments for tone)
-- ============================================================
CREATE TABLE condolences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memorial_id UUID NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_condolences_memorial ON condolences(memorial_id);

-- ============================================================
-- PAID BOOSTS
-- ============================================================
CREATE TABLE paid_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,     -- 'post' | 'lost_cat' | 'memorial'
    target_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MYR',
    duration_hours INTEGER NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid' | 'failed' | 'refunded'
    payment_provider VARCHAR(50),         -- 'stripe' | 'billplz' | 'toyyibpay'
    payment_reference VARCHAR(255),
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_boosts_user ON paid_boosts(user_id);
CREATE INDEX idx_boosts_target ON paid_boosts(target_type, target_id);

-- ============================================================
-- SUBSCRIPTIONS (Premium)
-- ============================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,            -- 'monthly' | 'yearly'
    status VARCHAR(20) DEFAULT 'active',  -- 'active' | 'cancelled' | 'expired'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MYR',
    payment_provider VARCHAR(50),
    payment_reference VARCHAR(255),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,            -- 'like' | 'comment' | 'follow' | 'lost_cat_nearby' | 'match_found' | 'condolence'
    title VARCHAR(200),
    body TEXT,
    data JSONB,                           -- Flexible payload
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- SPONSORED LISTINGS
-- ============================================================
CREATE TABLE sponsored_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_name VARCHAR(200) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT NOT NULL,
    placement VARCHAR(50) NOT NULL,       -- 'feed' | 'sidebar' | 'memorial_footer' | 'map'
    cpc_amount DECIMAL(10,4),             -- Cost per click
    cpm_amount DECIMAL(10,4),             -- Cost per 1000 impressions
    impression_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
