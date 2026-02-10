'use client';

import { useEffect } from 'react';
import { CatFeedCard } from '@/components/feed/CatFeedCard';
import { useFeedStore } from '@/store/feed-store';

export default function FeedPage() {
  const { posts, isLoading, hasMore, fetchFeed } = useFeedStore();

  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchFeed();
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-600">MeowLah</h1>
        <div className="flex items-center gap-3">
          <a href="/lost-cats/new" className="text-xs bg-alert-urgent text-white px-3 py-1.5 rounded-full font-medium">
            Report Lost Cat
          </a>
        </div>
      </header>

      {/* Feed */}
      <div>
        {posts.map((post) => (
          <CatFeedCard key={post.id} post={post} />
        ))}

        {isLoading && (
          <div className="py-8 text-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        )}

        {hasMore && !isLoading && posts.length > 0 && (
          <div className="py-6 text-center">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 text-sm text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition"
            >
              Load More
            </button>
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <p className="text-4xl mb-4">🐱</p>
            <p>No posts yet. Follow some cat lovers to see their posts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
