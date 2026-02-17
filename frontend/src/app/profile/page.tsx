'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      router.replace(`/profile/${user.username}`);
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  // Show login/register screen for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm text-center">
          {/* Branding */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">MeowLah</h1>
            <p className="mt-2 text-sm text-white/50">
              Malaysia&apos;s cat community
            </p>
          </div>

          {/* Avatar placeholder */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-elevated border border-dark-border flex items-center justify-center">
            <svg className="w-10 h-10 text-white/20" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>

          <p className="text-white/60 text-sm mb-8">
            Sign in to share cat photos, report lost cats, and connect with cat lovers in Malaysia.
          </p>

          {/* Auth buttons */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 bg-accent-pink text-white font-semibold rounded-lg hover:bg-accent-pink/90 transition text-center"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="block w-full py-3 bg-dark-elevated text-white font-semibold rounded-lg border border-dark-border hover:bg-dark-surface transition text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-white/40">Loading profile...</div>
    </div>
  );
}
