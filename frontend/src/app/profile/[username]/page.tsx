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
  const { user: currentUser, isAuthenticated } = useAuthStore();

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
        <div className="animate-pulse text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-gray-500 text-lg mb-4">User not found</p>
        <Link
          href="/feed"
          className="text-primary-500 font-medium hover:underline"
        >
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-gray-600 hover:text-gray-900">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold flex-1">@{profileUser.username}</h1>
        {isOwnProfile && (
          <Link href="/profile/edit" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        )}
      </header>

      {/* Profile Info */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-primary-100 overflow-hidden flex-shrink-0 border-2 border-primary-200">
            {profileUser.avatar_url ? (
              <Image
                src={profileUser.avatar_url}
                alt={profileUser.display_name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary-500">
                {getInitials(profileUser.display_name || profileUser.username)}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-around text-center">
            <div>
              <p className="text-lg font-bold">{profileUser.post_count ?? 0}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div>
              <p className="text-lg font-bold">{profileUser.follower_count ?? 0}</p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div>
              <p className="text-lg font-bold">{profileUser.following_count ?? 0}</p>
              <p className="text-xs text-gray-500">Following</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base">{profileUser.display_name}</h2>
            {profileUser.is_verified_rescuer && (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"
                title="Verified Cat Rescuer"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified Rescuer
              </span>
            )}
            {profileUser.is_premium && (
              <span className="inline-flex items-center text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Premium
              </span>
            )}
          </div>
          {profileUser.bio && (
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{profileUser.bio}</p>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4">
          {isOwnProfile ? (
            <Link
              href="/profile/edit"
              className="block w-full text-center py-2 px-4 bg-gray-100 text-gray-800 font-semibold text-sm rounded-xl hover:bg-gray-200 transition"
            >
              Edit Profile
            </Link>
          ) : (
            <button
              onClick={handleFollow}
              disabled={isFollowLoading}
              className={`w-full py-2 px-4 font-semibold text-sm rounded-xl transition disabled:opacity-50 ${
                profileUser.is_following
                  ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
            >
              {isFollowLoading
                ? 'Loading...'
                : profileUser.is_following
                  ? 'Unfollow'
                  : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Posts Grid */}
      <div className="px-0.5 pt-0.5">
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/feed/${post.id}`}
                className="relative aspect-square bg-gray-100 overflow-hidden"
              >
                <Image
                  src={post.media_urls[0]}
                  alt={post.caption || 'Post'}
                  fill
                  className="object-cover hover:opacity-90 transition"
                  sizes="(max-width: 768px) 33vw, 170px"
                  loading="lazy"
                />
                {post.media_urls.length > 1 && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg className="w-4 h-4 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 3a3 3 0 00-3 3v2.25a3 3 0 003 3h2.25a3 3 0 003-3V6a3 3 0 00-3-3H6zM15.75 3a3 3 0 00-3 3v2.25a3 3 0 003 3H18a3 3 0 003-3V6a3 3 0 00-3-3h-2.25zM6 12.75a3 3 0 00-3 3V18a3 3 0 003 3h2.25a3 3 0 003-3v-2.25a3 3 0 00-3-3H6zM17.625 13.5a.75.75 0 00-1.5 0v2.625H13.5a.75.75 0 000 1.5h2.625v2.625a.75.75 0 001.5 0v-2.625h2.625a.75.75 0 000-1.5h-2.625V13.5z" />
                    </svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
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
