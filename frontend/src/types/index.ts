// ============================================================
// Core type definitions for MeowLah — Catstagram + CatFinder Malaysia
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified_rescuer: boolean;
  is_premium: boolean;
  location_city?: string | null;
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  cats_owned?: CatProfile[];
  created_at: string;
}

export interface CatProfile {
  id: string;
  owner_id?: string;
  name: string;
  breed: string | null;
  color: string | null;
  age_years: number | null;
  age_months: number | null;
  gender: string | null;
  is_neutered: boolean | null;
  photo_url: string | null;
  description: string | null;
}

export interface Post {
  id: string;
  author: User;
  cat_profile: CatProfile | null;
  caption: string;
  media_urls: string[];
  media_type: 'image' | 'video';
  hashtags: string[];
  location_name: string | null;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_boosted: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  author: User;
  body: string;
  parent_id: string | null;
  created_at: string;
}

export interface LostCat {
  id: string;
  reporter: User;
  name: string;
  breed: string | null;
  color: string | null;
  description: string;
  photo_urls: string[];
  last_seen_lat: number;
  last_seen_lng: number;
  last_seen_address: string | null;
  last_seen_at: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  reward_amount: number | null;
  status: 'active' | 'found' | 'closed';
  is_boosted: boolean;
  sighting_count?: number;
  created_at: string;
}

export interface FoundCat {
  id: string;
  reporter: User;
  description: string;
  photo_urls: string[];
  found_lat: number;
  found_lng: number;
  found_address: string | null;
  found_at: string | null;
  contact_phone: string | null;
  status: 'active' | 'claimed' | 'closed';
  created_at: string;
}

export interface CatSighting {
  id: string;
  lost_cat_id: string;
  reporter: User;
  lat: number;
  lng: number;
  address: string | null;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Memorial {
  id: string;
  slug: string;
  creator: User;
  cat_name: string;
  cat_breed: string | null;
  cat_color: string | null;
  cat_photo_url: string | null;
  date_of_birth: string | null;
  date_of_passing: string | null;
  age_text: string | null;
  life_story: string | null;
  gallery_urls: string[];
  visibility: 'public' | 'private' | 'friends';
  theme: 'default' | 'garden' | 'starlight' | 'ocean';
  is_premium_theme: boolean;
  candle_count: number;
  flower_count: number;
  show_on_wall: boolean;
  created_at: string;
}

export interface MemorialTribute {
  id: string;
  user: User;
  tribute_type: 'candle' | 'flower' | 'heart';
  message: string | null;
  created_at: string;
}

export interface Condolence {
  id: string;
  author: User;
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'lost_cat_nearby' | 'match_found' | 'condolence' | 'sighting';
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AIMatchResult {
  found_cat_id: string;
  found_cat: FoundCat;
  similarity_score: number;
  matched_features: string[];
}

export interface PaymentHistory {
  id: string;
  target_type: string;
  target_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

export interface UserProfile extends User {
  notification_radius_km?: number;
  is_following?: boolean;
}
