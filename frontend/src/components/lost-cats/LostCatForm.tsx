'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { api, buildFormData, uploadWithProgress } from '@/lib/api';
import { queueRequest } from '@/lib/offline-queue';

/**
 * Form for reporting a lost cat.
 * Captures photos, description, last seen location, and contact info.
 * Works offline by queuing the submission for background sync.
 */
export function LostCatForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    name: '',
    breed: '',
    color: '',
    description: '',
    last_seen_address: '',
    last_seen_lat: 0,
    last_seen_lng: 0,
    contact_phone: '',
    contact_whatsapp: '',
    reward_amount: '',
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // Photo dropzone
  const onDrop = useCallback((files: File[]) => {
    setPhotos((prev) => [...prev, ...files].slice(0, 5));
    setPhotoPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Get user's current location
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          last_seen_lat: position.coords.latitude,
          last_seen_lng: position.coords.longitude,
        }));
        setLocationStatus('done');
      },
      () => {
        setLocationStatus('error');
        toast.error('Could not detect location. Please enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter your cat\'s name');
      return;
    }
    if (photos.length === 0) {
      toast.error('Please add at least one photo');
      return;
    }
    if (!form.last_seen_lat || !form.last_seen_lng) {
      toast.error('Location is required. Please allow location access or enter an address.');
      return;
    }

    setIsSubmitting(true);

    const formData = buildFormData({
      ...form,
      photos,
    });

    try {
      const { data } = await uploadWithProgress(
        '/lost-cats',
        formData,
        setUploadProgress
      );
      toast.success(`Report filed! ${data.notifications_sent} nearby users notified.`);
      router.push(`/lost-cats/${data.id}`);
    } catch {
      if (!navigator.onLine) {
        await queueRequest({
          url: '/lost-cats',
          method: 'POST',
          body: JSON.stringify(form),
          headers: { 'Content-Type': 'application/json' },
          type: 'lost-cat',
        });
        toast.success('Saved offline. Report will be submitted when you reconnect.');
        router.push('/lost-cats');
      } else {
        toast.error('Failed to submit report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report a Lost Cat</h1>
        <p className="text-sm text-gray-500 mt-1">
          We&apos;ll notify nearby MeowLah users and help you find your cat.
        </p>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos <span className="text-red-400">*</span>
          <span className="text-gray-400 font-normal ml-1">({photos.length}/5)</span>
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            isDragActive ? 'border-alert-urgent bg-red-50' : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-3xl mb-2">📸</p>
          <p className="text-sm text-gray-500">
            Drop photos of your cat or click to upload
          </p>
          <p className="text-xs text-gray-400 mt-1">Clear, recent photos help with AI matching</p>
        </div>
        {photoPreviews.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative shrink-0 w-20 h-20">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
                    setPhotoPreviews((prev) => prev.filter((_, idx) => idx !== i));
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

      {/* Cat Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Cat's name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
          <input
            type="text"
            value={form.breed}
            onChange={(e) => updateField('breed', e.target.value)}
            placeholder="e.g. Persian, Mixed"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Color / Markings</label>
          <input
            type="text"
            value={form.color}
            onChange={(e) => updateField('color', e.target.value)}
            placeholder="e.g. Orange tabby with white paws"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Any distinguishing features, collar, behavior, circumstances of disappearance..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          rows={4}
          required
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Last Seen Location <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.last_seen_address}
          onChange={(e) => updateField('last_seen_address', e.target.value)}
          placeholder="Address or landmark"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={detectLocation}
            className="text-sm text-blue-600 hover:underline"
          >
            {locationStatus === 'loading' ? 'Detecting...' : 'Use my current location'}
          </button>
          {locationStatus === 'done' && (
            <span className="text-xs text-green-600">Location detected</span>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={form.contact_phone}
            onChange={(e) => updateField('contact_phone', e.target.value)}
            placeholder="+60 12-345 6789"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input
            type="tel"
            value={form.contact_whatsapp}
            onChange={(e) => updateField('contact_whatsapp', e.target.value)}
            placeholder="+60 12-345 6789"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
      </div>

      {/* Reward */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reward (RM) — Optional
        </label>
        <input
          type="number"
          value={form.reward_amount}
          onChange={(e) => updateField('reward_amount', e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-alert-urgent text-white font-semibold rounded-xl hover:bg-red-700 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <span>Submitting... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
        ) : (
          'Submit Lost Cat Report'
        )}
      </button>
    </form>
  );
}
