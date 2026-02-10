'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    router.replace(`/profile/${user.username}`);
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-gray-400">Loading profile...</div>
    </div>
  );
}
