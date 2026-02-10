'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';

/**
 * Shows a subtle banner when the user is offline.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white text-center text-xs py-1.5 font-medium">
      You&apos;re offline. Some features are limited. Changes will sync when you&apos;re back online.
    </div>
  );
}
