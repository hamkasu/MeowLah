'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Custom "Install App" modal that intercepts the browser's
 * beforeinstallprompt event and shows a branded UI.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show the modal after a short delay so it doesn't feel intrusive
      const dismissed = localStorage.getItem('install_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowModal(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowModal(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem('install_dismissed', Date.now().toString());
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-float-up">
        <div className="text-center">
          <div className="text-4xl mb-3">🐱</div>
          <h2 className="text-xl font-bold text-gray-900">Install MeowLah</h2>
          <p className="mt-2 text-sm text-gray-600">
            Add MeowLah to your home screen for quick access to cat posts,
            lost cat alerts, and memorial pages — even offline!
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleInstall}
            className="w-full py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
