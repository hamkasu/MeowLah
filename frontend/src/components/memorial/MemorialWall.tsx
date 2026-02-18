'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import type { Memorial, PaginatedResponse } from '@/types';

/**
 * "In Loving Memory" public wall — shows all public memorials
 * in a masonry-style grid with a respectful, subdued design.
 */
export function MemorialWall() {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMemorials = async (pageNum: number) => {
    try {
      const { data } = await api.get<PaginatedResponse<Memorial>>('/memorials/wall', {
        params: { page: pageNum, limit: 12 },
      });
      if (pageNum === 1) {
        setMemorials(data.data);
      } else {
        setMemorials((prev) => [...prev, ...data.data]);
      }
      setHasMore(pageNum < data.pagination.total_pages);
    } catch {
      // Fall back to cached data or empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemorials(1);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMemorials(nextPage);
  };

  return (
    <div className="min-h-screen bg-memorial-50">
      {/* Header */}
      <header className="text-center py-10 px-4">
        <p className="text-sm uppercase tracking-[0.3em] text-memorial-500">
          In Loving Memory
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-memorial-800 font-memorial mt-2">
          Cat Memorial Garden
        </h1>
        <p className="text-sm text-memorial-500 mt-3 max-w-md mx-auto">
          A quiet space to remember the cats who filled our lives with love.
        </p>
        <Link
          href="/memorial/create"
          className="inline-block mt-6 px-6 py-2.5 bg-memorial-700 text-white rounded-lg text-sm hover:bg-memorial-800 transition"
        >
          Create a Memorial
        </Link>
      </header>

      {/* Memorial Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : memorials.length === 0 ? (
          <div className="text-center py-20 text-memorial-400">
            <p className="text-4xl mb-4">🕊️</p>
            <p>No memorials yet. Be the first to honor a beloved companion.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {memorials.map((memorial) => (
                <MemorialCard key={memorial.id} memorial={memorial} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMore}
                  className="px-8 py-2.5 border border-memorial-300 text-memorial-600 rounded-lg hover:bg-memorial-100 transition text-sm"
                >
                  Show More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MemorialCard({ memorial }: { memorial: Memorial }) {
  return (
    <Link
      href={`/memorial/${memorial.slug}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Photo */}
      <div className="relative h-48 bg-memorial-100">
        {memorial.cat_photo_url ? (
          <Image
            src={memorial.cat_photo_url}
            alt={memorial.cat_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            unoptimized={memorial.cat_photo_url.startsWith('data:')}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-memorial-300">
            🐱
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-memorial-800 group-hover:text-primary-600 transition">
          {memorial.cat_name}
        </h3>
        {memorial.cat_breed && (
          <p className="text-xs text-memorial-400 mt-0.5">{memorial.cat_breed}</p>
        )}
        {memorial.date_of_passing && (
          <p className="text-xs text-memorial-400 mt-1">
            Passed {format(new Date(memorial.date_of_passing), 'MMMM d, yyyy')}
          </p>
        )}

        {/* Tribute counts */}
        <div className="flex items-center gap-4 mt-3 text-xs text-memorial-400">
          <span>🕯️ {memorial.candle_count}</span>
          <span>🌸 {memorial.flower_count}</span>
        </div>
      </div>
    </Link>
  );
}
