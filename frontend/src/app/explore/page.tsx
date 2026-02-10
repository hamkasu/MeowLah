'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Post } from '@/types';

interface ExploreState {
  posts: Post[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
}

export default function ExplorePage() {
  const [state, setState] = useState<ExploreState>({
    posts: [],
    isLoading: false,
    page: 1,
    hasMore: true,
  });

  const fetchExplore = useCallback(async (reset = false) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const page = reset ? 1 : state.page;

    try {
      const { data } = await api.get('/posts/explore', {
        params: { page, limit: 30 },
      });

      setState((prev) => ({
        posts: reset ? data.data : [...prev.posts, ...data.data],
        page: page + 1,
        hasMore: page < data.pagination.total_pages,
        isLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.page]);

  useEffect(() => {
    fetchExplore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    if (!state.isLoading && state.hasMore) {
      fetchExplore();
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Explore</h1>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {state.posts.map((post) => (
          <Link
            key={post.id}
            href={`/feed/${post.id}`}
            className="relative aspect-square bg-gray-100 overflow-hidden group"
          >
            {post.media_urls[0] && (
              <Image
                src={post.media_urls[0]}
                alt={post.caption || 'Cat post'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                sizes="(max-width: 768px) 33vw, 200px"
              />
            )}

            {/* Hover overlay with stats */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex items-center gap-4 text-white text-sm font-semibold">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  {post.like_count}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                  </svg>
                  {post.comment_count}
                </span>
              </div>
            </div>

            {/* Video indicator */}
            {post.media_type === 'video' && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
            )}

            {/* Multi-image indicator */}
            {post.media_urls.length > 1 && post.media_type === 'image' && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 6a3 3 0 00-3-3H6a3 3 0 00-3 3v7.5a3 3 0 003 3v-6A4.5 4.5 0 0110.5 6h6z" />
                  <path d="M21 13.5a3 3 0 00-3-3h-7.5a3 3 0 00-3 3V18a3 3 0 003 3H18a3 3 0 003-3v-4.5z" />
                </svg>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Loading */}
      {state.isLoading && (
        <div className="py-8 text-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      )}

      {/* Load More */}
      {state.hasMore && !state.isLoading && state.posts.length > 0 && (
        <div className="py-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 text-sm text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition"
          >
            Load More
          </button>
        </div>
      )}

      {/* Empty state */}
      {!state.isLoading && state.posts.length === 0 && (
        <div className="py-20 text-center text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p>Nothing trending right now. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
