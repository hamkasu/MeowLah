'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  displayName: string;
}

export function AvatarUploader({ currentAvatarUrl, displayName }: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const loadUser = useAuthStore((s) => s.loadUser);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    // Show local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await api.put('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      // Refresh user data in auth store
      await loadUser();
      toast.success('Avatar updated successfully');
    } catch {
      toast.error('Failed to upload avatar');
      // Revert preview on failure
      setPreview(currentAvatarUrl);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    return () => URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="relative w-24 h-24 rounded-full overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {/* Avatar Image or Initials */}
        {preview ? (
          <Image
            src={preview}
            alt={displayName}
            width={96}
            height={96}
            className="w-full h-full object-cover"
            unoptimized={preview.startsWith('data:') || preview.startsWith('blob:')}
          />
        ) : (
          <div className="w-full h-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-500">
            {getInitials(displayName || 'U')}
          </div>
        )}

        {/* Camera Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-7 h-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        </div>

        {/* Upload Progress Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 relative">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray={`${(uploadProgress / 100) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-white text-xs mt-1 font-medium">{uploadProgress}%</span>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-gray-400 mt-2">Tap to change avatar</p>
    </div>
  );
}
