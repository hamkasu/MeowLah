'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount and listens for
 * background sync success messages from the SW.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[SW] Registered with scope:', registration.scope);

          // Check for updates periodically
          setInterval(() => registration.update(), 60 * 60 * 1000); // hourly
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err);
        });

      // Listen for sync success messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_SUCCESS') {
          // Could trigger a toast notification here
          console.log('[SW] Background sync succeeded for:', event.data.requestType);
        }
      });
    }
  }, []);

  return null;
}
