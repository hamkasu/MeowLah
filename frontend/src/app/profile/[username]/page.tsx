'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { User, Post } from '@/types';

interface ProfileUser extends User {
  post_count?: number;
  is_following?: boolean;
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated, logout } = useAuthStore();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.username === params.username;

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const [userRes, postsRes] = await Promise.all([
        api.get(`/users/${params.username}`),
        api.get(`/users/${params.username}/posts`),
      ]);
      setProfileUser(userRes.data);
      setPosts(postsRes.data.data ?? postsRes.data);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [params.username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profileUser || !isAuthenticated) {
      toast.error('Please log in to follow users');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (profileUser.is_following) {
        await api.delete(`/users/${profileUser.id}/follow`);
        setProfileUser((prev) =>
          prev
            ? {
                ...prev,
                is_following: false,
                follower_count: Math.max(0, (prev.follower_count ?? 0) - 1),
              }
            : null
        );
        toast.success(`Unfollowed @${profileUser.username}`);
      } else {
        await api.post(`/users/${profileUser.id}/follow`);
        setProfileUser((prev) =>
          prev
            ? {
                ...prev,
                is_following: true,
                follower_count: (prev.follower_count ?? 0) + 1,
              }
            : null
        );
        toast.success(`Following @${profileUser.username}`);
      }
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-white/50 text-lg mb-2">User not found</p>
        <p className="text-white/30 text-sm mb-6">This account may no longer exist.</p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/feed"
            className="text-accent-cyan font-medium hover:underline"
          >
            Back to Feed
          </Link>
          {isAuthenticated && (
            <button
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="px-6 py-2 bg-dark-elevated text-white/70 text-sm rounded-lg border border-dark-border hover:bg-dark-surface transition"
            >
              Sign Out &amp; Re-register
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-black min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-card/95 backdrop-blur-md border-b border-dark-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-white/70 hover:text-white">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold flex-1 text-white">@{profileUser.username}</h1>
        {isOwnProfile && (
          <div className="flex items-center gap-3">
            <Link href="/profile/edit" className="text-white/50 hover:text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <button
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="text-white/50 hover:text-white"
              title="Sign out"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Profile Info — TikTok style centered layout */}
      <div className="px-4 pt-6 pb-4 text-center">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-dark-elevated overflow-hidden mx-auto border-2 border-dark-border">
          {profileUser.avatar_url ? (
            <Image
              src={profileUser.avatar_url}
              alt={profileUser.display_name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/60">
              {getInitials(profileUser.display_name || profileUser.username)}
            </div>
          )}
        </div>

        {/* Name & badges */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <h2 className="font-bold text-lg text-white">{profileUser.display_name}</h2>
          {profileUser.is_verified_rescuer && (
            <span
              className="inline-flex items-center gap-0.5 text-[11px] bg-accent-cyan/20 text-accent-cyan px-2 py-0.5 rounded-full font-medium"
              title="Verified Cat Rescuer"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
              Rescuer
            </span>
          )}
          {profileUser.is_premium && (
            <span className="inline-flex items-center text-[11px] bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full font-medium">
              Premium
            </span>
          )}
        </div>

        {/* Stats - TikTok horizontal row */}
        <div className="flex justify-center gap-8 mt-4">
          <div>
            <p className="text-lg font-bold text-white">{profileUser.following_count ?? 0}</p>
            <p className="text-xs text-white/40">Following</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{profileUser.follower_count ?? 0}</p>
            <p className="text-xs text-white/40">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{profileUser.post_count ?? 0}</p>
            <p className="text-xs text-white/40">Likes</p>
          </div>
        </div>

        {profileUser.bio && (
          <p className="text-sm text-white/60 mt-3 whitespace-pre-line">{profileUser.bio}</p>
        )}

        {/* Action Button */}
        <div className="mt-4 flex gap-2 justify-center">
          {isOwnProfile ? (
            <Link
              href="/profile/edit"
              className="px-8 py-2 bg-dark-elevated text-white font-semibold text-sm rounded-md hover:bg-dark-border transition border border-dark-border"
            >
              Edit Profile
            </Link>
          ) : (
            <button
              onClick={handleFollow}
              disabled={isFollowLoading}
              className={`px-8 py-2 font-semibold text-sm rounded-md transition disabled:opacity-50 ${
                profileUser.is_following
                  ? 'bg-dark-elevated text-white border border-dark-border hover:bg-dark-border'
                  : 'bg-accent-pink text-white hover:bg-accent-pink/90'
              }`}
            >
              {isFollowLoading
                ? 'Loading...'
                : profileUser.is_following
                  ? 'Following'
                  : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Tab divider */}
      <div className="border-t border-dark-border flex">
        <div className="flex-1 py-2.5 flex items-center justify-center border-b-2 border-white">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
      </div>

      {/* Posts Grid */}
      <div>
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/feed/${post.id}`}
                className="relative aspect-[3/4] bg-dark-surface overflow-hidden"
              >
                <Image
                  src={post.media_urls[0]}
                  alt={post.caption || 'Post'}
                  fill
                  className="object-cover hover:opacity-90 transition"
                  sizes="(max-width: 768px) 33vw, 170px"
                  loading="lazy"
                />
                {/* View count overlay */}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-[10px] font-medium">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  {post.like_count > 0 ? formatCount(post.like_count) : '0'}
                </div>
                {post.media_urls.length > 1 && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg className="w-4 h-4 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 6a3 3 0 00-3-3H6a3 3 0 00-3 3v7.5a3 3 0 003 3v-6A4.5 4.5 0 0110.5 6h6z" />
                      <path d="M21 13.5a3 3 0 00-3-3h-7.5a3 3 0 00-3 3V18a3 3 0 003 3H18a3 3 0 003-3v-4.5z" />
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-white/30">
            <svg className="w-12 h-12 mx-auto mb-3 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <p className="text-sm">No posts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
