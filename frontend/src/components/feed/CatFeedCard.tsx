'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import type { Post } from '@/types';
import { useFeedStore } from '@/store/feed-store';

interface CatFeedCardProps {
  post: Post;
}

export function CatFeedCard({ post }: CatFeedCardProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { likePost, unlikePost } = useFeedStore();

  const handleLikeToggle = () => {
    if (post.is_liked) {
      unlikePost(post.id);
    } else {
      likePost(post.id);
    }
  };

  const hasMultipleImages = post.media_urls.length > 1;

  return (
    <article className="bg-white border-b border-gray-100">
      {/* Author Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${post.author.username}`}>
          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
            {post.author.avatar_url ? (
              <Image
                src={post.author.avatar_url}
                alt={post.author.username}
                width={36}
                height={36}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                {post.author.username[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${post.author.username}`}
            className="font-semibold text-sm hover:underline"
          >
            {post.author.username}
          </Link>
          {post.location_name && (
            <p className="text-xs text-gray-400 truncate">{post.location_name}</p>
          )}
        </div>
        {post.is_boosted && (
          <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
            Promoted
          </span>
        )}
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-gray-100">
        {post.media_type === 'video' ? (
          <video
            src={post.media_urls[0]}
            className="w-full h-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <>
            <Image
              src={post.media_urls[currentImageIndex]}
              alt={post.caption || 'Cat post'}
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 600px"
            />
            {/* Carousel dots */}
            {hasMultipleImages && (
              <>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {post.media_urls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full transition',
                        i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      )}
                    />
                  ))}
                </div>
                {/* Prev/Next buttons */}
                {currentImageIndex > 0 && (
                  <button
                    onClick={() => setCurrentImageIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center"
                  >
                    &lt;
                  </button>
                )}
                {currentImageIndex < post.media_urls.length - 1 && (
                  <button
                    onClick={() => setCurrentImageIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center"
                  >
                    &gt;
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-4">
        <button onClick={handleLikeToggle} className="p-1">
          <svg
            className={clsx('w-6 h-6', post.is_liked ? 'text-red-500' : 'text-gray-700')}
            viewBox="0 0 24 24"
            fill={post.is_liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={post.is_liked ? 0 : 1.5}
          >
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <Link href={`/feed/${post.id}`} className="p-1">
          <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
        </Link>
        <button
          className="p-1"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ url: `${window.location.origin}/feed/${post.id}` });
            }
          }}
        >
          <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>

      {/* Likes & Caption */}
      <div className="px-4 pb-3">
        {post.like_count > 0 && (
          <p className="font-semibold text-sm">
            {post.like_count.toLocaleString()} {post.like_count === 1 ? 'like' : 'likes'}
          </p>
        )}
        {post.caption && (
          <p className="text-sm mt-1">
            <Link href={`/profile/${post.author.username}`} className="font-semibold mr-1">
              {post.author.username}
            </Link>
            {post.caption.length > 120 && !showFullCaption ? (
              <>
                {post.caption.slice(0, 120)}...
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="text-gray-400 ml-1"
                >
                  more
                </button>
              </>
            ) : (
              post.caption
            )}
          </p>
        )}
        {post.comment_count > 0 && (
          <Link
            href={`/feed/${post.id}`}
            className="text-sm text-gray-400 mt-1 block"
          >
            View all {post.comment_count} comments
          </Link>
        )}
        <time className="text-xs text-gray-300 mt-1 block">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </time>
      </div>
    </article>
  );
}
