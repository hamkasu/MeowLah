'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MapView } from '@/components/map/MapView';
import type { LostCat, FoundCat } from '@/types';

export default function CatFinderPage() {
  const [lostCats, setLostCats] = useState<LostCat[]>([]);
  const [foundCats, setFoundCats] = useState<FoundCat[]>([]);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lostRes, foundRes] = await Promise.all([
          api.get('/lost-cats?status=active&limit=100'),
          api.get('/found-cats?status=active&limit=100'),
        ]);
        setLostCats(lostRes.data.data || []);
        setFoundCats(foundRes.data.data || []);
      } catch {
        // Will show empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-card/95 backdrop-blur-md border-b border-dark-border px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-lg font-bold text-white">CatFinder</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-dark-elevated rounded-lg p-0.5">
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  view === 'map' ? 'bg-dark-border text-white' : 'text-white/50'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  view === 'list' ? 'bg-dark-border text-white' : 'text-white/50'
                }`}
              >
                List
              </button>
            </div>
            <Link
              href="/lost-cats/new"
              className="bg-accent-pink text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              + Report Lost
            </Link>
            <Link
              href="/found-cats/new"
              className="bg-alert-found text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              + Report Found
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      {view === 'map' ? (
        <div className="h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <MapView lostCats={lostCats} foundCats={foundCats} />
          )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {lostCats.length === 0 && !isLoading && (
            <p className="text-center text-white/40 py-10">No active lost cat reports nearby.</p>
          )}
          {lostCats.map((cat) => (
            <Link
              key={cat.id}
              href={`/lost-cats/${cat.id}`}
              className="block bg-dark-card rounded-xl p-4 border border-dark-border hover:border-dark-elevated transition"
            >
              <div className="flex gap-3">
                {cat.photo_urls[0] && (
                  <img
                    src={cat.photo_urls[0]}
                    alt={cat.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-accent-pink/20 text-accent-pink px-2 py-0.5 rounded-full font-medium">
                      LOST
                    </span>
                    {cat.is_boosted && (
                      <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-full">
                        URGENT
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mt-1 text-white">{cat.name}</h3>
                  <p className="text-xs text-white/50 truncate">{cat.description}</p>
                  {cat.reward_amount && (
                    <p className="text-xs text-alert-found font-medium mt-1">
                      Reward: RM{cat.reward_amount}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
