'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import type { Post } from '@/types';
import { useFeedStore } from '@/store/feed-store';

interface CatFeedCardProps {
  post: Post;
  isActive?: boolean;
}

export function CatFeedCard({ post, isActive = false }: CatFeedCardProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const { likePost, unlikePost } = useFeedStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play/pause video based on visibility
  useEffect(() => {
    if (post.media_type === 'video' && videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, post.media_type]);

  const handleLikeToggle = () => {
    if (post.is_liked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
      setShowLikeAnim(true);
      setTimeout(() => setShowLikeAnim(false), 600);
    }
  };

  const handleDoubleTap = () => {
    if (!post.is_liked) {
      likePost(post.id);
      setShowLikeAnim(true);
      setTimeout(() => setShowLikeAnim(false), 600);
    }
  };

  const hasMultipleImages = post.media_urls.length > 1;

  // Swipe handling for image carousel
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50 && currentImageIndex < post.media_urls.length - 1) {
      setCurrentImageIndex((i) => i + 1);
    } else if (diff < -50 && currentImageIndex > 0) {
      setCurrentImageIndex((i) => i - 1);
    }
  };

  return (
    <article
      className="tiktok-card bg-black"
      onDoubleClick={handleDoubleTap}
    >
      {/* Full-screen media background */}
      <div
        className="absolute inset-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {post.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={post.media_urls[0]}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={post.media_urls[currentImageIndex]}
            alt={post.caption || 'Cat post'}
            fill
            className="object-cover"
            priority={isActive}
            sizes="100vw"
            unoptimized={post.media_urls[currentImageIndex]?.startsWith('data:')}
          />
        )}

        {/* Carousel indicators */}
        {hasMultipleImages && (
          <div className="absolute top-14 left-0 right-0 flex justify-center gap-1 z-20">
            {post.media_urls.map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'h-0.5 rounded-full transition-all',
                  i === currentImageIndex ? 'w-4 bg-white' : 'w-2 bg-white/40'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Double-tap like animation */}
      {showLikeAnim && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <svg className="w-24 h-24 text-accent-pink animate-like-pop drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
      )}

      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-24 tiktok-gradient-top z-10" />

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-72 tiktok-gradient-bottom z-10" />

      {/* Right-side action buttons (TikTok style) */}
      <div className="tiktok-actions">
        {/* Author avatar */}
        <Link href={`/profile/${post.author.username}`} className="tiktok-action-btn mb-2">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-dark-elevated">
              {post.author.avatar_url ? (
                <Image
                  src={post.author.avatar_url}
                  alt={post.author.username}
                  width={44}
                  height={44}
                  className="object-cover"
                  unoptimized={post.author.avatar_url.startsWith('data:')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-white font-bold">
                  {post.author.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-accent-pink rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">+</span>
            </div>
          </div>
        </Link>

        {/* Like */}
        <button onClick={handleLikeToggle} className="tiktok-action-btn">
          <svg
            className={clsx(
              'w-8 h-8 drop-shadow-lg transition-colors',
              post.is_liked ? 'text-accent-pink' : 'text-white'
            )}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span>{post.like_count > 0 ? formatCount(post.like_count) : 'Like'}</span>
        </button>

        {/* Comment */}
        <Link href={`/feed/${post.id}`} className="tiktok-action-btn">
          <svg className="w-8 h-8 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
          </svg>
          <span>{post.comment_count > 0 ? formatCount(post.comment_count) : 'Comment'}</span>
        </Link>

        {/* Share */}
        <button
          className="tiktok-action-btn"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ url: `${window.location.origin}/feed/${post.id}` });
            }
          }}
        >
          <svg className="w-8 h-8 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z" clipRule="evenodd" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Bottom-left info overlay (author + caption) */}
      <div className="tiktok-info">
        {/* Author name */}
        <Link
          href={`/profile/${post.author.username}`}
          className="font-bold text-base text-white drop-shadow-lg"
        >
          @{post.author.username}
        </Link>

        {post.is_boosted && (
          <span className="ml-2 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            Sponsored
          </span>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-white/90 mt-1.5 drop-shadow leading-5">
            {post.caption.length > 80 && !showFullCaption ? (
              <>
                {post.caption.slice(0, 80)}...
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFullCaption(true); }}
                  className="text-white/60 ml-1 font-medium"
                >
                  more
                </button>
              </>
            ) : (
              post.caption
            )}
          </p>
        )}

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.hashtags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-sm text-white font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Location + time */}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-white/50">
          {post.location_name && (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742z" clipRule="evenodd" />
              </svg>
              <span>{post.location_name}</span>
              <span>-</span>
            </>
          )}
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </article>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
