'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { buildFormData, uploadWithProgress } from '@/lib/api';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_IMAGE_TYPES = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] };
const ACCEPTED_VIDEO_TYPES = { 'video/*': ['.mp4', '.mov', '.webm'] };
const ACCEPTED_TYPES = { ...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES };

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export function CreatePostForm() {
  const router = useRouter();

  const [files, setFiles] = useState<FilePreview[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [locationName, setLocationName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);

      const remaining = MAX_FILES - files.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_FILES} files allowed.`);
        return;
      }

      const newFiles = acceptedFiles.slice(0, remaining);

      // Validate: if there are videos, only 1 video is allowed and no images mixed
      const hasVideo = files.some((f) => f.type === 'video');
      const incomingVideo = newFiles.some((f) => f.type.startsWith('video'));

      if (hasVideo || (incomingVideo && files.length > 0)) {
        const totalVideos = files.filter((f) => f.type === 'video').length + newFiles.filter((f) => f.type.startsWith('video')).length;
        if (totalVideos > 1) {
          setError('Only one video per post is allowed.');
          return;
        }
      }

      const previews: FilePreview[] = newFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
      }));

      setFiles((prev) => [...prev, ...previews]);
    },
    [files]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];
      if (firstError?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 50 MB.');
      } else if (firstError?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload images or videos.');
      } else {
        setError(firstError?.message || 'File upload error.');
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError('Please add at least one photo or video.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const parsedHashtags = hashtags
        .split(/[\s,#]+/)
        .filter(Boolean)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      const mediaType = files[0].type;

      const formDataPayload: Record<string, unknown> = {
        caption,
        media_type: mediaType,
        media: files.map((f) => f.file),
      };

      if (parsedHashtags.length > 0) {
        formDataPayload.hashtags = parsedHashtags;
      }

      if (locationName.trim()) {
        formDataPayload.location_name = locationName.trim();
      }

      const formData = buildFormData(formDataPayload);

      await uploadWithProgress('/posts', formData, (percent) => {
        setUploadProgress(percent);
      });

      // Clean up previews
      files.forEach((f) => URL.revokeObjectURL(f.preview));

      router.push('/feed');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to create post. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Dropzone */}
      <div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            isDragActive
              ? 'border-accent-pink bg-accent-pink/10'
              : 'border-dark-border hover:border-white/30 hover:bg-dark-elevated'
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <svg
              className="mx-auto w-10 h-10 text-white/30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
            {isDragActive ? (
              <p className="text-sm text-accent-pink font-medium">
                Drop your files here...
              </p>
            ) : (
              <>
                <p className="text-sm text-white/60">
                  <span className="font-semibold text-accent-cyan">Click to upload</span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-white/30">
                  Images (JPG, PNG, WebP, GIF) or Video (MP4, MOV). Max 50 MB each.
                </p>
              </>
            )}
          </div>
        </div>

        {/* File Previews */}
        {files.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {files.map((filePreview, index) => (
              <div
                key={`${filePreview.file.name}-${index}`}
                className="relative aspect-square rounded-lg overflow-hidden bg-dark-surface group"
              >
                {filePreview.type === 'video' ? (
                  <video
                    src={filePreview.preview}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={filePreview.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  X
                </button>
                {filePreview.type === 'video' && (
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    VIDEO
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caption */}
      <div>
        <label htmlFor="caption" className="block text-sm font-medium text-white/70 mb-1">
          Caption
        </label>
        <textarea
          id="caption"
          rows={3}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption for your cat post..."
          className="w-full rounded-lg border border-dark-border bg-dark-elevated px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent resize-none"
          maxLength={2200}
        />
        <p className="text-xs text-white/30 text-right mt-0.5">
          {caption.length}/2200
        </p>
      </div>

      {/* Hashtags */}
      <div>
        <label htmlFor="hashtags" className="block text-sm font-medium text-white/70 mb-1">
          Hashtags
        </label>
        <input
          id="hashtags"
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#meowlah #catsofmalaysia #streetcat"
          className="w-full rounded-lg border border-dark-border bg-dark-elevated px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent"
        />
        <p className="text-xs text-white/30 mt-0.5">
          Separate with spaces or commas
        </p>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-white/70 mb-1">
          Location
        </label>
        <input
          id="location"
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="e.g. Petaling Jaya, Kuala Lumpur"
          className="w-full rounded-lg border border-dark-border bg-dark-elevated px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-accent-pink/10 border border-accent-pink/30 text-accent-pink text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload progress */}
      {isSubmitting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Uploading...</span>
            <span className="font-medium text-accent-cyan">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-dark-elevated rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent-pink h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || files.length === 0}
        className="w-full py-3 bg-accent-pink text-white font-semibold rounded-lg hover:bg-accent-pink/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? 'Posting...' : 'Share Post'}
      </button>
    </form>
  );
}
