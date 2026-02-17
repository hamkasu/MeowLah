// ============================================================
// Feed store — manages post feed state with pagination
// ============================================================

import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Post } from '@/types';

interface FeedState {
  posts: Post[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;

  fetchFeed: (reset?: boolean) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  page: 1,
  hasMore: false,

  fetchFeed: async (reset = false) => {
    if (get().isLoading) return; // prevent concurrent calls
    const page = reset ? 1 : get().page;
    set({ isLoading: true });

    try {
      const { data } = await api.get('/posts', { params: { page, limit: 20 } });
      set({
        posts: reset ? data.data : [...get().posts, ...data.data],
        page: page + 1,
        hasMore: page < data.pagination.total_pages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, hasMore: false });
    }
  },

  likePost: async (postId) => {
    // Optimistic update
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, is_liked: true, like_count: p.like_count + 1 } : p
      ),
    });
    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      // Revert on failure
      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, is_liked: false, like_count: p.like_count - 1 } : p
        ),
      });
    }
  },

  unlikePost: async (postId) => {
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, is_liked: false, like_count: p.like_count - 1 } : p
      ),
    });
    try {
      await api.delete(`/posts/${postId}/like`);
    } catch {
      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, is_liked: true, like_count: p.like_count + 1 } : p
        ),
      });
    }
  },
}));
