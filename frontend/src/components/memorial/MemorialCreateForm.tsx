'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { api, buildFormData, uploadWithProgress } from '@/lib/api';
import { queueRequest } from '@/lib/offline-queue';

const THEMES = [
  { id: 'default', name: 'Classic', preview: 'bg-memorial-100', premium: false },
  { id: 'garden', name: 'Garden', preview: 'bg-green-100', premium: false },
  { id: 'starlight', name: 'Starlight', preview: 'bg-indigo-900', premium: true },
  { id: 'ocean', name: 'Ocean', preview: 'bg-sky-100', premium: true },
];

export function MemorialCreateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    cat_name: '',
    cat_breed: '',
    cat_color: '',
    date_of_birth: '',
    date_of_passing: '',
    life_story: '',
    visibility: 'public' as 'public' | 'private' | 'friends',
    theme: 'default',
    show_on_wall: true,
  });

  const [catPhoto, setCatPhoto] = useState<File | null>(null);
  const [catPhotoPreview, setCatPhotoPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Main photo dropzone
  const onDropMain = useCallback((files: File[]) => {
    if (files[0]) {
      setCatPhoto(files[0]);
      setCatPhotoPreview(URL.createObjectURL(files[0]));
    }
  }, []);

  const { getRootProps: getMainProps, getInputProps: getMainInput } = useDropzone({
    onDrop: onDropMain,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Gallery dropzone
  const onDropGallery = useCallback((files: File[]) => {
    setGalleryFiles((prev) => [...prev, ...files].slice(0, 20)); // Max 20 photos
    setGalleryPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ].slice(0, 20));
  }, []);

  const { getRootProps: getGalleryProps, getInputProps: getGalleryInput } = useDropzone({
    onDrop: onDropGallery,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 20,
    maxSize: 10 * 1024 * 1024,
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cat_name.trim()) {
      toast.error('Please enter your cat\'s name');
      return;
    }

    setIsSubmitting(true);

    const formData = buildFormData({
      ...form,
      cat_photo: catPhoto,
      gallery: galleryFiles,
    });

    try {
      const { data } = await uploadWithProgress(
        '/memorials',
        formData,
        setUploadProgress
      );
      toast.success('Memorial created. Rest in peace.');
      router.push(`/memorial/${data.slug}`);
    } catch {
      // Queue for background sync if offline
      if (!navigator.onLine) {
        await queueRequest({
          url: '/memorials',
          method: 'POST',
          body: JSON.stringify(form), // Note: files would need base64 encoding for full offline support
          headers: { 'Content-Type': 'application/json' },
          type: 'memorial',
        });
        toast.success('Saved offline. Will submit when you\'re back online.');
        router.push('/memorial-wall');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-memorial-800 font-memorial">
          Create a Memorial
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Honor your beloved companion with a lasting tribute
        </p>
      </div>

      {/* Cat Photo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photo
        </label>
        <div
          {...getMainProps()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition"
        >
          <input {...getMainInput()} />
          {catPhotoPreview ? (
            <img
              src={catPhotoPreview}
              alt="Preview"
              className="mx-auto h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="text-gray-400">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm">Drop a photo or click to upload</p>
            </div>
          )}
        </div>
      </div>

      {/* Cat Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.cat_name}
            onChange={(e) => updateField('cat_name', e.target.value)}
            placeholder="Their name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
          <input
            type="text"
            value={form.cat_breed}
            onChange={(e) => updateField('cat_breed', e.target.value)}
            placeholder="e.g. Persian, Domestic Shorthair"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Passing</label>
          <input
            type="date"
            value={form.date_of_passing}
            onChange={(e) => updateField('date_of_passing', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      </div>

      {/* Life Story */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Life Story / Tribute
        </label>
        <textarea
          value={form.life_story}
          onChange={(e) => updateField('life_story', e.target.value)}
          placeholder="Share your favorite memories, their personality, what made them special..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          rows={6}
        />
      </div>

      {/* Gallery */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Memories ({galleryFiles.length}/20)
        </label>
        <div
          {...getGalleryProps()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-primary-400 transition"
        >
          <input {...getGalleryInput()} />
          <p className="text-sm text-gray-400">Drop photos or click to add more</p>
        </div>
        {galleryPreviews.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {galleryPreviews.map((url, i) => (
              <div key={i} className="relative aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setGalleryFiles((prev) => prev.filter((_, idx) => idx !== i));
                    setGalleryPreviews((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateField('theme', t.id)}
              className={`relative p-3 rounded-lg border-2 transition ${
                form.theme === t.id ? 'border-primary-500' : 'border-gray-200'
              }`}
            >
              <div className={`w-full h-12 rounded ${t.preview} mb-2`} />
              <span className="text-xs font-medium">{t.name}</span>
              {t.premium && (
                <span className="absolute top-1 right-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
        <div className="flex gap-3">
          {(['public', 'friends', 'private'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateField('visibility', v)}
              className={`px-4 py-2 rounded-lg text-sm capitalize border transition ${
                form.visibility === v
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Show on Memorial Wall */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.show_on_wall}
          onChange={(e) => updateField('show_on_wall', e.target.checked)}
          className="w-4 h-4 text-primary-500 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">
          Show on the &ldquo;In Loving Memory&rdquo; public wall
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-memorial-700 text-white font-semibold rounded-xl hover:bg-memorial-800 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <span>Creating Memorial... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
        ) : (
          'Create Memorial'
        )}
      </button>
    </form>
  );
}
