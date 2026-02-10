# REST API Endpoints

Base URL: `https://api.meowlah.my/v1`

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login, returns JWT | No |
| POST | `/auth/refresh` | Refresh JWT token | Yes |
| POST | `/auth/forgot-password` | Send password reset email | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### POST `/auth/register`
```json
// Request
{ "email": "string", "username": "string", "password": "string", "display_name": "string" }
// Response 201
{ "user": { "id": "uuid", "email": "string", "username": "string" }, "token": "jwt_string", "refresh_token": "string" }
```

### POST `/auth/login`
```json
// Request
{ "email": "string", "password": "string" }
// Response 200
{ "user": { "id": "uuid", "email": "string", "username": "string", "is_premium": false }, "token": "jwt_string", "refresh_token": "string" }
```

---

## Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update profile | Yes |
| GET | `/users/:username` | Get public profile | No |
| POST | `/users/:id/follow` | Follow user | Yes |
| DELETE | `/users/:id/follow` | Unfollow user | Yes |
| GET | `/users/:id/followers` | List followers | No |
| GET | `/users/:id/following` | List following | No |
| PUT | `/users/me/push-subscription` | Save push subscription | Yes |
| PUT | `/users/me/location` | Update user location | Yes |

---

## Cat Profiles

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/cats` | Create cat profile | Yes |
| GET | `/cats/:id` | Get cat profile | No |
| PUT | `/cats/:id` | Update cat profile | Yes |
| DELETE | `/cats/:id` | Delete cat profile | Yes |
| GET | `/users/:id/cats` | List user's cats | No |

### POST `/cats`
```json
// Request (multipart/form-data)
{ "name": "string", "breed": "string", "color": "string", "age_years": 3, "gender": "male", "photo": "File" }
// Response 201
{ "id": "uuid", "name": "string", "photo_url": "https://..." }
```

---

## Posts (Catstagram)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/posts` | Create post | Yes |
| GET | `/posts` | Get feed (paginated) | Yes |
| GET | `/posts/explore` | Explore/trending | No |
| GET | `/posts/:id` | Get single post | No |
| DELETE | `/posts/:id` | Delete post | Yes |
| POST | `/posts/:id/like` | Like post | Yes |
| DELETE | `/posts/:id/like` | Unlike post | Yes |
| GET | `/posts/:id/comments` | Get comments | No |
| POST | `/posts/:id/comments` | Add comment | Yes |
| GET | `/posts/search?q=&hashtag=` | Search posts | No |

### POST `/posts`
```json
// Request (multipart/form-data)
{ "caption": "string", "media": "File[]", "media_type": "image|video", "cat_profile_id": "uuid?", "hashtags": ["string"], "location_name": "string?", "location_lat": 3.1390, "location_lng": 101.6869 }
// Response 201
{ "id": "uuid", "caption": "string", "media_urls": ["https://..."], "author": { "id": "uuid", "username": "string" }, "created_at": "ISO8601" }
```

---

## Lost Cats (CatFinder)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/lost-cats` | Report lost cat | Yes |
| GET | `/lost-cats` | List active lost cats (paginated, filterable) | No |
| GET | `/lost-cats/:id` | Get single report | No |
| PUT | `/lost-cats/:id` | Update report | Yes |
| PUT | `/lost-cats/:id/status` | Change status (found/closed) | Yes |
| GET | `/lost-cats/nearby?lat=&lng=&radius=` | Get nearby lost cats | No |
| POST | `/lost-cats/:id/sightings` | Report sighting | Yes |
| GET | `/lost-cats/:id/sightings` | Get sightings for a report | No |
| GET | `/lost-cats/:id/matches` | Get AI-suggested matches | Yes |
| GET | `/lost-cats/:id/poster` | Generate missing poster (image) | No |

### POST `/lost-cats`
```json
// Request (multipart/form-data)
{ "name": "string", "breed": "string?", "color": "string?", "description": "string", "photos": "File[]", "last_seen_lat": 3.1390, "last_seen_lng": 101.6869, "last_seen_address": "string?", "last_seen_at": "ISO8601?", "contact_phone": "string?", "contact_whatsapp": "string?", "reward_amount": 100.00 }
// Response 201
{ "id": "uuid", "name": "string", "status": "active", "photo_urls": ["https://..."], "notifications_sent": 15, "created_at": "ISO8601" }
```

---

## Found Cats

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/found-cats` | Report found cat | Yes |
| GET | `/found-cats` | List found cats | No |
| GET | `/found-cats/:id` | Get single report | No |
| PUT | `/found-cats/:id/status` | Change status | Yes |

---

## Memorials (Cat Memorial Garden)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/memorials` | Create memorial | Yes |
| GET | `/memorials/:slug` | Get memorial by slug (public) | No |
| PUT | `/memorials/:id` | Update memorial | Yes |
| DELETE | `/memorials/:id` | Delete memorial | Yes |
| GET | `/memorials` | List user's memorials | Yes |
| GET | `/memorials/wall` | Public memorial wall | No |
| POST | `/memorials/:id/tributes` | Light candle / send flower | Yes |
| GET | `/memorials/:id/tributes` | Get tributes | No |
| POST | `/memorials/:id/condolences` | Post condolence | Yes |
| GET | `/memorials/:id/condolences` | Get condolences | No |
| GET | `/memorials/:id/export-pdf` | Export memorial as PDF | Yes |

### POST `/memorials`
```json
// Request (multipart/form-data)
{ "cat_name": "string", "cat_breed": "string?", "cat_color": "string?", "cat_photo": "File?", "date_of_birth": "YYYY-MM-DD?", "date_of_passing": "YYYY-MM-DD?", "life_story": "string", "gallery": "File[]?", "visibility": "public|private|friends", "theme": "default|garden|starlight|ocean", "show_on_wall": true }
// Response 201
{ "id": "uuid", "slug": "whiskers-forever-remembered-abc123", "cat_name": "Whiskers", "share_url": "https://meowlah.my/memorial/whiskers-forever-remembered-abc123", "created_at": "ISO8601" }
```

### GET `/memorials/:slug`
```json
// Response 200
{ "id": "uuid", "slug": "string", "cat_name": "string", "cat_breed": "string", "cat_photo_url": "https://...", "date_of_birth": "YYYY-MM-DD", "date_of_passing": "YYYY-MM-DD", "age_text": "3 years, 2 months", "life_story": "string", "gallery_urls": ["https://..."], "visibility": "public", "theme": "garden", "candle_count": 42, "flower_count": 18, "creator": { "id": "uuid", "username": "string", "display_name": "string" }, "created_at": "ISO8601" }
```

---

## Payments & Boosts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/boosts` | Create boost payment | Yes |
| GET | `/boosts/me` | List my boosts | Yes |
| POST | `/subscriptions` | Subscribe to premium | Yes |
| GET | `/subscriptions/me` | Get subscription status | Yes |
| PUT | `/subscriptions/me/cancel` | Cancel subscription | Yes |
| POST | `/payments/webhook` | Payment provider webhook | No* |

---

## Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | Get notifications (paginated) | Yes |
| PUT | `/notifications/:id/read` | Mark as read | Yes |
| PUT | `/notifications/read-all` | Mark all as read | Yes |
