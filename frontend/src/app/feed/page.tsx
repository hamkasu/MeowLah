'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { CatFeedCard } from '@/components/feed/CatFeedCard';
import { useFeedStore } from '@/store/feed-store';
import { useAuthStore } from '@/store/auth-store';

export default function FeedPage() {
  const { posts, isLoading, hasMore, fetchFeed } = useFeedStore();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  // Intersection Observer to track which card is in view
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const idx = Number(entry.target.getAttribute('data-index'));
        if (!isNaN(idx)) setActiveIndex(idx);
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.6,
    });

    const cards = feedRef.current?.querySelectorAll('[data-index]');
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [posts, observerCallback]);

  // Load more when reaching near the end
  useEffect(() => {
    if (posts.length > 0 && activeIndex >= posts.length - 3 && hasMore && !isLoading) {
      fetchFeed();
    }
  }, [activeIndex, posts.length, hasMore, isLoading, fetchFeed]);

  return (
    <div className="relative h-[100dvh] bg-black">
      {/* Top header overlay - TikTok style */}
      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-center pt-3 pb-2 px-4">
          {/* Left: Live indicator (decorative) */}
          <div className="absolute left-4 pointer-events-auto">
            <Link
              href="/lost-cats"
              className="flex items-center gap-1 bg-accent-pink/90 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742z" clipRule="evenodd" />
              </svg>
              SOS
            </Link>
          </div>

          {/* Center: Tab switcher */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={() => setActiveTab('following')}
              className={`tiktok-tab ${activeTab === 'following' ? 'tiktok-tab-active' : 'tiktok-tab-inactive'}`}
            >
              Following
            </button>
            <div className="w-px h-4 bg-white/30" />
            <button
              onClick={() => setActiveTab('foryou')}
              className={`tiktok-tab ${activeTab === 'foryou' ? 'tiktok-tab-active' : 'tiktok-tab-inactive'}`}
            >
              For You
            </button>
          </div>

          {/* Right: Search */}
          <div className="absolute right-4 pointer-events-auto">
            <Link href="/explore" className="text-white">
              <svg className="w-6 h-6 drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Active tab indicator */}
        <div className="flex justify-center">
          <div className="flex items-center gap-4 relative">
            <div className="w-16" />
            <div className="w-px h-0" />
            <div className="w-14" />
            <div
              className="absolute bottom-0 h-0.5 w-8 bg-white rounded-full transition-all duration-300"
              style={{
                left: activeTab === 'following' ? '12px' : 'calc(100% - 44px)',
              }}
            />
          </div>
        </div>
      </header>

      {/* Auth banner overlay — only show after auth state is resolved */}
      {!authLoading && !isAuthenticated && (
        <div className="fixed top-14 left-0 right-0 z-40 pointer-events-auto">
          <div className="mx-4 bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-white mb-2">
              Join Malaysia&apos;s cat community
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-5 py-1.5 bg-accent-pink text-white text-sm font-semibold rounded-lg hover:bg-accent-pink/90 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-5 py-1.5 bg-white/10 text-white text-sm font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TikTok-style full-screen feed */}
      <div ref={feedRef} className="tiktok-feed">
        {posts.map((post, index) => (
          <div key={post.id} data-index={index}>
            <CatFeedCard post={post} isActive={index === activeIndex} />
          </div>
        ))}

        {isLoading && (
          <div className="h-[100dvh] flex items-center justify-center snap-start">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white/50 text-sm">Loading...</span>
            </div>
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="h-[100dvh] flex flex-col items-center justify-center snap-start text-white/40">
            <span className="text-6xl mb-4">🐱</span>
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm mt-1">Follow cat lovers to see their posts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
