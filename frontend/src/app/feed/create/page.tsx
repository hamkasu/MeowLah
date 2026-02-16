'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { useAuthStore } from '@/store/auth-store';

export default function CreatePostPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto pb-24 bg-black min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-card/95 backdrop-blur-md border-b border-dark-border px-4 py-3 flex items-center justify-between">
        <Link href="/feed" className="text-white/70 hover:text-white transition">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-white">New Post</h1>
        <div className="w-6" />
      </header>

      {/* Form */}
      <div className="px-4 py-6">
        <CreatePostForm />
      </div>
    </div>
  );
}
