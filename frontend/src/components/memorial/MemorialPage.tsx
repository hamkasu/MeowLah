'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import type { Memorial, Condolence, MemorialTribute } from '@/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cacheMemorial } from '@/lib/offline-queue';

// Theme configurations for memorial pages
const THEMES = {
  default: {
    bg: 'bg-memorial-50',
    accent: 'text-memorial-700',
    card: 'bg-white',
  },
  garden: {
    bg: 'bg-green-50',
    accent: 'text-green-800',
    card: 'bg-white',
  },
  starlight: {
    bg: 'bg-indigo-950',
    accent: 'text-indigo-200',
    card: 'bg-indigo-900/50',
  },
  ocean: {
    bg: 'bg-sky-50',
    accent: 'text-sky-800',
    card: 'bg-white',
  },
};

interface MemorialPageProps {
  memorial: Memorial;
  condolences: Condolence[];
  tributes: MemorialTribute[];
}

export function MemorialPage({ memorial, condolences: initialCondolences, tributes }: MemorialPageProps) {
  const [condolences, setCondolences] = useState(initialCondolences);
  const [newCondolence, setNewCondolence] = useState('');
  const [candleCount, setCandleCount] = useState(memorial.candle_count);
  const [flowerCount, setFlowerCount] = useState(memorial.flower_count);
  const [showCandleAnimation, setShowCandleAnimation] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const theme = THEMES[memorial.theme] || THEMES.default;
  const isDark = memorial.theme === 'starlight';

  // Cache memorial for offline viewing
  if (typeof window !== 'undefined') {
    cacheMemorial(memorial.slug, memorial);
  }

  const handleLightCandle = async () => {
    if (!isAuthenticated) return;
    try {
      await api.post(`/memorials/${memorial.id}/tributes`, {
        tribute_type: 'candle',
      });
      setCandleCount((c) => c + 1);
      setShowCandleAnimation(true);
      setTimeout(() => setShowCandleAnimation(false), 3000);
    } catch {
      // Silently fail — grief-safe UX, don't show errors
    }
  };

  const handleSendFlower = async () => {
    if (!isAuthenticated) return;
    try {
      await api.post(`/memorials/${memorial.id}/tributes`, {
        tribute_type: 'flower',
      });
      setFlowerCount((f) => f + 1);
    } catch {
      // Silent fail
    }
  };

  const handleSubmitCondolence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCondolence.trim() || !isAuthenticated) return;

    try {
      const { data } = await api.post(`/memorials/${memorial.id}/condolences`, {
        message: newCondolence.trim(),
      });
      setCondolences([data, ...condolences]);
      setNewCondolence('');
    } catch {
      // Silent fail
    }
  };

  return (
    <div className={clsx('min-h-screen font-memorial', theme.bg)}>
      {/* Header with cat photo */}
      <header className="relative">
        {memorial.cat_photo_url ? (
          <div className="relative h-72 sm:h-96">
            {memorial.cat_photo_url.startsWith('data:') ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={memorial.cat_photo_url}
                alt={`In memory of ${memorial.cat_name}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={memorial.cat_photo_url}
                alt={`In memory of ${memorial.cat_name}`}
                fill
                className="object-cover"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          </div>
        ) : (
          <div className="h-48 bg-memorial-200" />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">In Loving Memory</p>
          <h1 className="text-4xl font-bold mt-1">{memorial.cat_name}</h1>
          {memorial.cat_breed && (
            <p className="text-sm opacity-80 mt-1">{memorial.cat_breed}</p>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Dates */}
        <div className={clsx('text-center', theme.accent)}>
          {memorial.date_of_birth && memorial.date_of_passing && (
            <p className="text-lg">
              {format(new Date(memorial.date_of_birth), 'MMMM d, yyyy')}
              {' — '}
              {format(new Date(memorial.date_of_passing), 'MMMM d, yyyy')}
            </p>
          )}
          {memorial.age_text && (
            <p className="text-sm mt-1 opacity-70">{memorial.age_text}</p>
          )}
        </div>

        {/* Life Story / Tribute */}
        {memorial.life_story && (
          <section className={clsx('rounded-xl p-6', theme.card, isDark && 'text-white')}>
            <h2 className={clsx('text-xl font-semibold mb-4', theme.accent)}>
              Their Story
            </h2>
            <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap">
              {memorial.life_story}
            </div>
          </section>
        )}

        {/* Gallery */}
        {memorial.gallery_urls && memorial.gallery_urls.length > 0 && (
          <section>
            <h2 className={clsx('text-xl font-semibold mb-4', theme.accent)}>
              Cherished Memories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {memorial.gallery_urls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  {url.startsWith('data:') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={url}
                      alt={`Memory of ${memorial.cat_name}`}
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Image
                      src={url}
                      alt={`Memory of ${memorial.cat_name}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Virtual Tributes */}
        <section className={clsx('rounded-xl p-6 text-center', theme.card, isDark && 'text-white')}>
          <h2 className={clsx('text-xl font-semibold mb-6', theme.accent)}>
            Leave a Tribute
          </h2>

          <div className="flex justify-center gap-8">
            {/* Light a Candle */}
            <button
              onClick={handleLightCandle}
              className="flex flex-col items-center gap-2 group"
              disabled={!isAuthenticated}
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition">
                  <div className="candle-flame" />
                </div>
                {showCandleAnimation && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 animate-float-up text-2xl">
                    🕯️
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-600">Light a Candle</span>
              <span className="text-xs text-gray-400">{candleCount} lit</span>
            </button>

            {/* Send a Flower */}
            <button
              onClick={handleSendFlower}
              className="flex flex-col items-center gap-2 group"
              disabled={!isAuthenticated}
            >
              <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition text-2xl">
                🌸
              </div>
              <span className="text-sm text-gray-600">Send a Flower</span>
              <span className="text-xs text-gray-400">{flowerCount} sent</span>
            </button>
          </div>
        </section>

        {/* Condolences */}
        <section className={clsx('rounded-xl p-6', theme.card, isDark && 'text-white')}>
          <h2 className={clsx('text-xl font-semibold mb-4', theme.accent)}>
            Condolences ({condolences.length})
          </h2>

          {isAuthenticated && (
            <form onSubmit={handleSubmitCondolence} className="mb-6">
              <textarea
                value={newCondolence}
                onChange={(e) => setNewCondolence(e.target.value)}
                placeholder="Share a kind memory or message..."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 text-sm"
                rows={3}
              />
              <button
                type="submit"
                className="mt-2 px-6 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition disabled:opacity-50"
                disabled={!newCondolence.trim()}
              >
                Send Condolence
              </button>
            </form>
          )}

          <div className="space-y-4">
            {condolences.map((c) => (
              <div key={c.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{c.author.display_name}</span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{c.message}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Share */}
        <div className="text-center text-sm text-gray-400 py-8">
          <p>Share this memorial to keep {memorial.cat_name}&apos;s memory alive</p>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `In Memory of ${memorial.cat_name}`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="mt-2 text-primary-500 hover:underline"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
