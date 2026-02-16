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

const TRENDING_TAGS = ['catsofmalaysia', 'meowlah', 'rescuecat', 'persiancat', 'fluffycat', 'catlife'];

export default function ExplorePage() {
  const [state, setState] = useState<ExploreState>({
    posts: [],
    isLoading: false,
    page: 1,
    hasMore: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="min-h-screen bg-black pb-20">
      {/* Search header */}
      <header className="sticky top-0 z-40 bg-dark-card/95 backdrop-blur-md px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search cats, hashtags, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-elevated text-white text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <svg className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
        </div>

        {/* Trending hashtag pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-2">
          {TRENDING_TAGS.map((tag) => (
            <button
              key={tag}
              className="flex-shrink-0 bg-dark-elevated hover:bg-dark-border text-white/70 text-xs px-3.5 py-1.5 rounded-full transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </header>

      {/* TikTok-style staggered grid */}
      <div className="grid grid-cols-2 gap-0.5 px-0.5">
        {state.posts.map((post, idx) => (
          <Link
            key={post.id}
            href={`/feed/${post.id}`}
            className="relative overflow-hidden group"
            style={{ aspectRatio: idx % 3 === 0 ? '3/4' : '1/1' }}
          >
            {post.media_urls[0] && (
              <Image
                src={post.media_urls[0]}
                alt={post.caption || 'Cat post'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                sizes="50vw"
              />
            )}

            {/* Bottom gradient + stats */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-dark-elevated overflow-hidden border border-white/20">
                  {post.author.avatar_url ? (
                    <Image src={post.author.avatar_url} alt="" width={20} height={20} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-bold">
                      {post.author.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs text-white font-medium truncate max-w-[80px]">
                  @{post.author.username}
                </span>
              </div>
              <div className="flex items-center gap-1 text-white/80">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span className="text-[10px] font-semibold">{formatCount(post.like_count)}</span>
              </div>
            </div>

            {/* Video play indicator */}
            {post.media_type === 'video' && (
              <div className="absolute top-2 left-2 flex items-center gap-1 text-white/80">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
            )}

            {/* Multi-image indicator */}
            {post.media_urls.length > 1 && post.media_type === 'image' && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 6a3 3 0 00-3-3H6a3 3 0 00-3 3v7.5a3 3 0 003 3v-6A4.5 4.5 0 0110.5 6h6z" />
                  <path d="M21 13.5a3 3 0 00-3-3h-7.5a3 3 0 00-3 3V18a3 3 0 003 3H18a3 3 0 003-3v-4.5z" />
                </svg>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Loading spinner */}
      {state.isLoading && (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Load More */}
      {state.hasMore && !state.isLoading && state.posts.length > 0 && (
        <div className="py-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2.5 text-sm text-white bg-dark-elevated rounded-full hover:bg-dark-border transition"
          >
            Load More
          </button>
        </div>
      )}

      {/* Empty state */}
      {!state.isLoading && state.posts.length === 0 && (
        <div className="py-20 text-center text-white/30">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-lg font-medium">Nothing trending yet</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
