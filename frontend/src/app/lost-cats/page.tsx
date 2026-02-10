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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900">CatFinder</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  view === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                List
              </button>
            </div>
            <Link
              href="/lost-cats/new"
              className="bg-alert-urgent text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
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
              <p className="text-gray-400">Loading map...</p>
            </div>
          ) : (
            <MapView lostCats={lostCats} foundCats={foundCats} />
          )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {lostCats.length === 0 && !isLoading && (
            <p className="text-center text-gray-400 py-10">No active lost cat reports nearby.</p>
          )}
          {lostCats.map((cat) => (
            <Link
              key={cat.id}
              href={`/lost-cats/${cat.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
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
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      LOST
                    </span>
                    {cat.is_boosted && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        URGENT
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mt-1">{cat.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{cat.description}</p>
                  {cat.reward_amount && (
                    <p className="text-xs text-green-600 font-medium mt-1">
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
