'use client';

import { useEffect, useState, useRef } from 'react';
import type { LostCat, FoundCat } from '@/types';

/**
 * Interactive map showing lost and found cat locations.
 * Uses Leaflet (free, no API key required for basic tiles).
 * Dynamically imported to avoid SSR issues.
 */

// Leaflet types — we lazy-load the library
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;

interface MapViewProps {
  lostCats: LostCat[];
  foundCats: FoundCat[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (type: 'lost' | 'found', id: string) => void;
}

// Default center: Kuala Lumpur, Malaysia
const DEFAULT_CENTER: [number, number] = [3.139, 101.6869];
const DEFAULT_ZOOM = 12;

export function MapView({
  lostCats,
  foundCats,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMarkerClick,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current || leafletMapRef.current) return;

      // Initialize map
      const map = L.map(mapRef.current).setView(center, zoom);

      // OpenStreetMap tiles (free, no API key)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
      setIsLoaded(true);
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const updateMarkers = async () => {
      if (!leafletMapRef.current || !isLoaded) return;

      const L = await import('leaflet');
      const map = leafletMapRef.current;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Lost cat markers (red)
      const lostIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🐱</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      lostCats.forEach((cat) => {
        const marker = L.marker([cat.last_seen_lat, cat.last_seen_lng], { icon: lostIcon })
          .addTo(map)
          .bindPopup(`
            <div style="max-width:200px;">
              <strong style="color:#dc2626;">LOST: ${cat.name}</strong>
              ${cat.photo_urls[0] ? `<br><img src="${cat.photo_urls[0]}" style="width:100%;border-radius:4px;margin-top:4px;" />` : ''}
              <p style="font-size:12px;margin-top:4px;">${cat.description?.slice(0, 100) || ''}...</p>
              ${cat.reward_amount ? `<p style="font-size:12px;color:#16a34a;font-weight:bold;">Reward: RM${cat.reward_amount}</p>` : ''}
            </div>
          `);

        marker.on('click', () => onMarkerClick?.('lost', cat.id));
        markersRef.current.push(marker);
      });

      // Found cat markers (green)
      const foundIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:#16a34a;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🐱</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      foundCats.forEach((cat) => {
        const marker = L.marker([cat.found_lat, cat.found_lng], { icon: foundIcon })
          .addTo(map)
          .bindPopup(`
            <div style="max-width:200px;">
              <strong style="color:#16a34a;">FOUND CAT</strong>
              ${cat.photo_urls[0] ? `<br><img src="${cat.photo_urls[0]}" style="width:100%;border-radius:4px;margin-top:4px;" />` : ''}
              <p style="font-size:12px;margin-top:4px;">${cat.description?.slice(0, 100) || ''}...</p>
            </div>
          `);

        marker.on('click', () => onMarkerClick?.('found', cat.id));
        markersRef.current.push(marker);
      });
    };

    updateMarkers();
  }, [lostCats, foundCats, isLoaded, onMarkerClick]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      )}
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-red-600" />
          <span>Lost ({lostCats.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-600" />
          <span>Found ({foundCats.length})</span>
        </div>
      </div>
    </div>
  );
}
