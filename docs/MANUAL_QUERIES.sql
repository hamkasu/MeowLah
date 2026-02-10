-- ============================================================
-- MeowLah — Manual SQL Queries
-- Run these in Railway's SQL console or any PostgreSQL client
-- ============================================================


-- ************************************************************
-- 1. USERS
-- ************************************************************

-- List all users
SELECT id, username, email, display_name, is_premium, is_verified_rescuer, created_at
FROM users
ORDER BY created_at DESC;

-- Find user by email
SELECT * FROM users WHERE email = 'someone@example.com';

-- Find user by username
SELECT * FROM users WHERE username = 'catloverkl';

-- Grant verified rescuer badge
UPDATE users
SET is_verified_rescuer = TRUE, updated_at = NOW()
WHERE username = 'catloverkl';

-- Revoke verified rescuer badge
UPDATE users
SET is_verified_rescuer = FALSE, updated_at = NOW()
WHERE username = 'catloverkl';

-- Grant premium manually (e.g. promo, comp)
UPDATE users
SET is_premium = TRUE, updated_at = NOW()
WHERE id = 'USER_UUID_HERE';

-- Revoke premium
UPDATE users
SET is_premium = FALSE, updated_at = NOW()
WHERE id = 'USER_UUID_HERE';

-- Ban / soft-delete a user (set email to disabled pattern)
-- NOTE: CASCADE on FKs will remove their posts, memorials, etc.
-- To preserve content, consider a soft-delete column instead.
DELETE FROM users WHERE id = 'USER_UUID_HERE';

-- Count total users
SELECT COUNT(*) AS total_users FROM users;

-- Count users registered today
SELECT COUNT(*) FROM users
WHERE created_at >= CURRENT_DATE;

-- Count users registered this month
SELECT COUNT(*) FROM users
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);

-- Users with push subscriptions (can receive notifications)
SELECT COUNT(*) FROM users WHERE push_subscription IS NOT NULL;

-- Top 10 users by follower count
SELECT u.id, u.username, u.display_name, COUNT(f.follower_id) AS follower_count
FROM users u
LEFT JOIN follows f ON f.following_id = u.id
GROUP BY u.id
ORDER BY follower_count DESC
LIMIT 10;

-- Reset a user's password (use bcrypt hash from your app or CLI)
-- Generate hash: node -e "require('bcryptjs').hash('newpassword',12).then(console.log)"
UPDATE users
SET password_hash = '$2a$12$HASH_HERE', updated_at = NOW()
WHERE email = 'someone@example.com';


-- ************************************************************
-- 2. POSTS (Catstagram)
-- ************************************************************

-- List recent posts
SELECT p.id, p.caption, p.media_type, p.like_count, p.comment_count,
       p.is_boosted, u.username, p.created_at
FROM posts p
JOIN users u ON u.id = p.author_id
ORDER BY p.created_at DESC
LIMIT 20;

-- Find a specific post
SELECT * FROM posts WHERE id = 'POST_UUID_HERE';

-- Delete a post (admin moderation)
DELETE FROM posts WHERE id = 'POST_UUID_HERE';

-- Remove all posts by a user
DELETE FROM posts WHERE author_id = 'USER_UUID_HERE';

-- Fix like_count drift (recount from actual likes)
UPDATE posts
SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id);

-- Fix comment_count drift (recount from actual comments)
UPDATE posts
SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = posts.id);

-- Top 10 most-liked posts all time
SELECT p.id, p.caption, p.like_count, u.username, p.created_at
FROM posts p
JOIN users u ON u.id = p.author_id
ORDER BY p.like_count DESC
LIMIT 10;

-- Posts with a specific hashtag
SELECT p.id, p.caption, p.like_count, u.username
FROM posts p
JOIN users u ON u.id = p.author_id
WHERE 'kucingorange' = ANY(p.hashtags)
ORDER BY p.created_at DESC
LIMIT 20;

-- Most used hashtags (top 20)
SELECT tag, COUNT(*) AS usage_count
FROM posts, UNNEST(hashtags) AS tag
GROUP BY tag
ORDER BY usage_count DESC
LIMIT 20;


-- ************************************************************
-- 3. LOST CATS (CatFinder)
-- ************************************************************

-- All active lost cat reports
SELECT lc.id, lc.name, lc.breed, lc.color, lc.status, lc.is_boosted,
       lc.reward_amount, lc.last_seen_address, u.username, lc.created_at
FROM lost_cats lc
JOIN users u ON u.id = lc.reporter_id
WHERE lc.status = 'active'
ORDER BY lc.is_boosted DESC, lc.created_at DESC;

-- Mark a lost cat as found
UPDATE lost_cats
SET status = 'found', updated_at = NOW()
WHERE id = 'LOST_CAT_UUID_HERE';

-- Close a lost cat report (owner gave up / resolved privately)
UPDATE lost_cats
SET status = 'closed', updated_at = NOW()
WHERE id = 'LOST_CAT_UUID_HERE';

-- Reopen a closed report
UPDATE lost_cats
SET status = 'active', updated_at = NOW()
WHERE id = 'LOST_CAT_UUID_HERE';

-- Lost cats near a location (e.g. KL city center, 10km radius)
SELECT lc.id, lc.name, lc.last_seen_address,
       ST_Distance(
           ST_SetSRID(ST_MakePoint(lc.last_seen_lng, lc.last_seen_lat), 4326)::geography,
           ST_SetSRID(ST_MakePoint(101.6869, 3.1390), 4326)::geography
       ) / 1000 AS distance_km
FROM lost_cats lc
WHERE lc.status = 'active'
  AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(lc.last_seen_lng, lc.last_seen_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(101.6869, 3.1390), 4326)::geography,
      10000  -- 10km in meters
  )
ORDER BY distance_km ASC;

-- Sightings for a specific lost cat
SELECT cs.*, u.username
FROM cat_sightings cs
JOIN users u ON u.id = cs.reporter_id
WHERE cs.lost_cat_id = 'LOST_CAT_UUID_HERE'
ORDER BY cs.created_at DESC;

-- Count active lost cats by state/city
SELECT last_seen_address, COUNT(*) AS count
FROM lost_cats
WHERE status = 'active' AND last_seen_address IS NOT NULL
GROUP BY last_seen_address
ORDER BY count DESC;

-- Auto-close stale reports older than 90 days
UPDATE lost_cats
SET status = 'closed', updated_at = NOW()
WHERE status = 'active'
  AND created_at < NOW() - INTERVAL '90 days';


-- ************************************************************
-- 4. FOUND CATS
-- ************************************************************

-- All active found cat reports
SELECT fc.id, fc.description, fc.found_address, fc.status,
       u.username, fc.created_at
FROM found_cats fc
JOIN users u ON u.id = fc.reporter_id
WHERE fc.status = 'active'
ORDER BY fc.created_at DESC;

-- Mark a found cat as claimed
UPDATE found_cats
SET status = 'claimed', updated_at = NOW()
WHERE id = 'FOUND_CAT_UUID_HERE';

-- Link a found cat to a lost cat report (manual match)
UPDATE found_cats
SET matched_lost_cat_id = 'LOST_CAT_UUID_HERE', updated_at = NOW()
WHERE id = 'FOUND_CAT_UUID_HERE';


-- ************************************************************
-- 5. MEMORIALS
-- ************************************************************

-- All public memorials
SELECT m.id, m.slug, m.cat_name, m.cat_breed, m.theme,
       m.candle_count, m.flower_count, u.username, m.created_at
FROM memorials m
JOIN users u ON u.id = m.creator_id
WHERE m.visibility = 'public'
ORDER BY m.created_at DESC;

-- Find a memorial by slug
SELECT * FROM memorials WHERE slug = 'whiskers-forever-remembered-abc123';

-- Change memorial visibility
UPDATE memorials
SET visibility = 'private', updated_at = NOW()
WHERE id = 'MEMORIAL_UUID_HERE';

-- Change memorial visibility to public
UPDATE memorials
SET visibility = 'public', updated_at = NOW()
WHERE id = 'MEMORIAL_UUID_HERE';

-- Remove a memorial from the public wall
UPDATE memorials
SET show_on_wall = FALSE, updated_at = NOW()
WHERE id = 'MEMORIAL_UUID_HERE';

-- Fix candle_count drift (recount)
UPDATE memorials
SET candle_count = (
    SELECT COUNT(*) FROM memorial_tributes
    WHERE memorial_id = memorials.id AND tribute_type = 'candle'
);

-- Fix flower_count drift (recount)
UPDATE memorials
SET flower_count = (
    SELECT COUNT(*) FROM memorial_tributes
    WHERE memorial_id = memorials.id AND tribute_type = 'flower'
);

-- Top 10 most-visited memorials (by tribute count)
SELECT m.id, m.slug, m.cat_name, m.candle_count + m.flower_count AS total_tributes
FROM memorials m
WHERE m.visibility = 'public'
ORDER BY total_tributes DESC
LIMIT 10;

-- Condolences for a specific memorial
SELECT c.message, u.username, c.created_at
FROM condolences c
JOIN users u ON u.id = c.author_id
WHERE c.memorial_id = 'MEMORIAL_UUID_HERE'
ORDER BY c.created_at DESC;

-- Delete an offensive condolence
DELETE FROM condolences WHERE id = 'CONDOLENCE_UUID_HERE';

-- Delete an offensive comment
DELETE FROM comments WHERE id = 'COMMENT_UUID_HERE';


-- ************************************************************
-- 6. BOOSTS & PAYMENTS
-- ************************************************************

-- All active boosts
SELECT pb.id, pb.target_type, pb.target_id, pb.amount, pb.currency,
       pb.payment_status, pb.starts_at, pb.expires_at, u.username
FROM paid_boosts pb
JOIN users u ON u.id = pb.user_id
WHERE pb.payment_status = 'paid' AND pb.expires_at > NOW()
ORDER BY pb.expires_at ASC;

-- Manually activate a boost (e.g. after manual payment confirmation)
UPDATE paid_boosts
SET payment_status = 'paid',
    starts_at = NOW(),
    expires_at = NOW() + (duration_hours || ' hours')::INTERVAL
WHERE id = 'BOOST_UUID_HERE';

-- Then apply it to the target:
-- For a post boost:
UPDATE posts
SET is_boosted = TRUE,
    boost_expires_at = (SELECT expires_at FROM paid_boosts WHERE id = 'BOOST_UUID_HERE')
WHERE id = 'POST_UUID_HERE';

-- For a lost cat boost:
UPDATE lost_cats
SET is_boosted = TRUE,
    boost_expires_at = (SELECT expires_at FROM paid_boosts WHERE id = 'BOOST_UUID_HERE')
WHERE id = 'LOST_CAT_UUID_HERE';

-- Expire all overdue boosts manually
UPDATE posts
SET is_boosted = FALSE
WHERE is_boosted = TRUE AND boost_expires_at < NOW();

UPDATE lost_cats
SET is_boosted = FALSE
WHERE is_boosted = TRUE AND boost_expires_at < NOW();

-- Issue a refund (mark boost as refunded)
UPDATE paid_boosts
SET payment_status = 'refunded'
WHERE id = 'BOOST_UUID_HERE';

-- Revenue this month
SELECT SUM(amount) AS monthly_revenue, currency
FROM paid_boosts
WHERE payment_status = 'paid'
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY currency;

-- Revenue breakdown by type
SELECT target_type, COUNT(*) AS count, SUM(amount) AS total
FROM paid_boosts
WHERE payment_status = 'paid'
GROUP BY target_type
ORDER BY total DESC;


-- ************************************************************
-- 7. SUBSCRIPTIONS
-- ************************************************************

-- Active subscriptions
SELECT s.id, s.plan, s.amount, s.status, s.starts_at, s.expires_at,
       s.auto_renew, u.username
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY s.expires_at ASC;

-- Expire overdue subscriptions
UPDATE subscriptions
SET status = 'expired', updated_at = NOW()
WHERE status = 'active' AND expires_at < NOW();

-- Also revoke premium flag on expired users
UPDATE users
SET is_premium = FALSE, updated_at = NOW()
WHERE id IN (
    SELECT user_id FROM subscriptions
    WHERE status = 'expired'
)
AND id NOT IN (
    SELECT user_id FROM subscriptions
    WHERE status = 'active' AND expires_at > NOW()
);

-- Manually extend a subscription (e.g. goodwill gesture)
UPDATE subscriptions
SET expires_at = expires_at + INTERVAL '30 days', updated_at = NOW()
WHERE id = 'SUBSCRIPTION_UUID_HERE';

-- Subscription revenue this month
SELECT SUM(amount) AS total, currency
FROM subscriptions
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY currency;


-- ************************************************************
-- 8. NOTIFICATIONS
-- ************************************************************

-- Unread notifications for a user
SELECT * FROM notifications
WHERE user_id = 'USER_UUID_HERE' AND is_read = FALSE
ORDER BY created_at DESC;

-- Mark all notifications read for a user
UPDATE notifications
SET is_read = TRUE
WHERE user_id = 'USER_UUID_HERE' AND is_read = FALSE;

-- Delete old notifications (older than 90 days)
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '90 days';

-- Notification count by type (insight into what triggers the most alerts)
SELECT type, COUNT(*) AS count
FROM notifications
GROUP BY type
ORDER BY count DESC;


-- ************************************************************
-- 9. SPONSORED LISTINGS
-- ************************************************************

-- Active sponsored listings
SELECT * FROM sponsored_listings
WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;

-- Create a new sponsored listing
INSERT INTO sponsored_listings (advertiser_name, title, description, image_url, link_url, placement, cpc_amount, starts_at, expires_at)
VALUES (
    'PetSmart Malaysia',
    'Premium Cat Food - 20% Off',
    'Get the best nutrition for your cat. Free delivery in KL.',
    'https://media.meowlah.my/ads/petsmart-banner.webp',
    'https://petsmart.my/promo?ref=meowlah',
    'feed',
    0.50,
    NOW(),
    NOW() + INTERVAL '30 days'
);

-- Record a click on a sponsored listing
UPDATE sponsored_listings
SET click_count = click_count + 1
WHERE id = 'LISTING_UUID_HERE';

-- Record an impression batch (e.g. after serving 1000 impressions)
UPDATE sponsored_listings
SET impression_count = impression_count + 1000
WHERE id = 'LISTING_UUID_HERE';

-- Deactivate a listing
UPDATE sponsored_listings
SET is_active = FALSE
WHERE id = 'LISTING_UUID_HERE';

-- Sponsored listing performance report
SELECT id, advertiser_name, title, placement,
       impression_count, click_count,
       CASE WHEN impression_count > 0
            THEN ROUND(click_count::NUMERIC / impression_count * 100, 2)
            ELSE 0
       END AS ctr_percent,
       cpc_amount, click_count * cpc_amount AS total_revenue
FROM sponsored_listings
ORDER BY total_revenue DESC;


-- ************************************************************
-- 10. FOLLOWS
-- ************************************************************

-- Who does a user follow?
SELECT u.username, u.display_name, f.created_at
FROM follows f
JOIN users u ON u.id = f.following_id
WHERE f.follower_id = 'USER_UUID_HERE'
ORDER BY f.created_at DESC;

-- Who follows a user?
SELECT u.username, u.display_name, f.created_at
FROM follows f
JOIN users u ON u.id = f.follower_id
WHERE f.following_id = 'USER_UUID_HERE'
ORDER BY f.created_at DESC;

-- Mutual follows (friends)
SELECT u.username
FROM follows f1
JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
JOIN users u ON u.id = f1.following_id
WHERE f1.follower_id = 'USER_UUID_HERE';

-- Remove a follow relationship (admin)
DELETE FROM follows
WHERE follower_id = 'FOLLOWER_UUID' AND following_id = 'FOLLOWING_UUID';


-- ************************************************************
-- 11. ANALYTICS & DASHBOARD QUERIES
-- ************************************************************

-- Daily active users (users who liked, posted, or commented today)
SELECT COUNT(DISTINCT user_id) AS dau
FROM (
    SELECT author_id AS user_id FROM posts WHERE created_at >= CURRENT_DATE
    UNION
    SELECT user_id FROM post_likes WHERE created_at >= CURRENT_DATE
    UNION
    SELECT author_id AS user_id FROM comments WHERE created_at >= CURRENT_DATE
) active;

-- Signups per day (last 30 days)
SELECT DATE(created_at) AS day, COUNT(*) AS signups
FROM users
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;

-- Posts per day (last 30 days)
SELECT DATE(created_at) AS day, COUNT(*) AS posts
FROM posts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;

-- Lost cat reports per day (last 30 days)
SELECT DATE(created_at) AS day, COUNT(*) AS reports
FROM lost_cats
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;

-- Platform-wide stats summary
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM posts) AS total_posts,
    (SELECT COUNT(*) FROM lost_cats WHERE status = 'active') AS active_lost_cats,
    (SELECT COUNT(*) FROM lost_cats WHERE status = 'found') AS found_cats,
    (SELECT COUNT(*) FROM found_cats WHERE status = 'active') AS active_found_reports,
    (SELECT COUNT(*) FROM memorials) AS total_memorials,
    (SELECT COUNT(*) FROM memorials WHERE visibility = 'public') AS public_memorials,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS active_subscribers;

-- Database table sizes (useful for monitoring growth)
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;


-- ************************************************************
-- 12. MAINTENANCE & CLEANUP
-- ************************************************************

-- Remove orphaned post_likes (where post no longer exists)
DELETE FROM post_likes pl
WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = pl.post_id);

-- Remove orphaned notifications (older than 6 months)
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '6 months';

-- Remove orphaned cat sightings for closed reports
DELETE FROM cat_sightings cs
WHERE cs.lost_cat_id IN (
    SELECT id FROM lost_cats WHERE status = 'closed' AND updated_at < NOW() - INTERVAL '180 days'
);

-- Vacuum and analyze (run during low traffic)
-- Reclaims storage and updates query planner statistics
VACUUM ANALYZE users;
VACUUM ANALYZE posts;
VACUUM ANALYZE lost_cats;
VACUUM ANALYZE memorials;
VACUUM ANALYZE notifications;

-- Reindex if query performance degrades
REINDEX TABLE posts;
REINDEX TABLE lost_cats;
REINDEX TABLE memorials;

-- Check for unused indexes
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
