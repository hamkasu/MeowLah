'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';

interface RegisterFormProps {
  onSuccess?: () => void;
}

interface FormState {
  display_name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
}

interface FormErrors {
  display_name?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  accept_terms?: string;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  // Display name
  if (!form.display_name.trim()) {
    errors.display_name = 'Display name is required';
  }

  // Username
  if (!form.username.trim()) {
    errors.username = 'Username is required';
  } else if (form.username.length < 3 || form.username.length > 50) {
    errors.username = 'Username must be 3-50 characters';
  } else if (!USERNAME_REGEX.test(form.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }

  // Email
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password
  if (!form.password) {
    errors.password = 'Password is required';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  // Confirm password
  if (!form.confirm_password) {
    errors.confirm_password = 'Please confirm your password';
  } else if (form.password !== form.confirm_password) {
    errors.confirm_password = 'Passwords do not match';
  }

  // Terms
  if (!form.accept_terms) {
    errors.accept_terms = 'You must accept the terms and conditions';
  }

  return errors;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState<FormState>({
    display_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    accept_terms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field being edited
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Show the first error as a toast
      const firstError = Object.values(validationErrors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email,
        username: form.username,
        password: form.password,
        display_name: form.display_name,
      });
      toast.success('Welcome to MeowLah! Your account is ready.');
      onSuccess?.();
    } catch (err: unknown) {
      let message = 'Registration failed. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string; detail?: string; message?: string } } };
        message = axiosErr.response?.data?.detail || axiosErr.response?.data?.error || axiosErr.response?.data?.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const fieldError = (field: keyof FormErrors) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-red-500">{errors[field]}</p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Display Name */}
      <div>
        <label htmlFor="reg-display-name" className="block text-sm font-medium text-white/70 mb-1">
          Display Name
        </label>
        <input
          id="reg-display-name"
          type="text"
          autoComplete="name"
          value={form.display_name}
          onChange={(e) => updateField('display_name', e.target.value)}
          placeholder="How others will see you"
          className={`w-full px-4 py-3 border rounded-lg bg-dark-elevated focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent transition text-white placeholder:text-white/30 ${
            errors.display_name ? 'border-red-400' : 'border-dark-border'
          }`}
        />
        {fieldError('display_name')}
      </div>

      {/* Username */}
      <div>
        <label htmlFor="reg-username" className="block text-sm font-medium text-white/70 mb-1">
          Username
        </label>
        <input
          id="reg-username"
          type="text"
          autoComplete="username"
          value={form.username}
          onChange={(e) => updateField('username', e.target.value.toLowerCase())}
          placeholder="your_username"
          className={`w-full px-4 py-3 border rounded-lg bg-dark-elevated focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent transition text-white placeholder:text-white/30 ${
            errors.username ? 'border-red-400' : 'border-dark-border'
          }`}
        />
        <p className="mt-1 text-xs text-white/30">3-50 characters, letters, numbers, and underscores only</p>
        {fieldError('username')}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-white/70 mb-1">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="you@example.com"
          className={`w-full px-4 py-3 border rounded-lg bg-dark-elevated focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent transition text-white placeholder:text-white/30 ${
            errors.email ? 'border-red-400' : 'border-dark-border'
          }`}
        />
        {fieldError('email')}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-white/70 mb-1">
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          placeholder="Min. 8 characters"
          className={`w-full px-4 py-3 border rounded-lg bg-dark-elevated focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent transition text-white placeholder:text-white/30 ${
            errors.password ? 'border-red-400' : 'border-dark-border'
          }`}
        />
        {fieldError('password')}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-white/70 mb-1">
          Confirm Password
        </label>
        <input
          id="reg-confirm-password"
          type="password"
          autoComplete="new-password"
          value={form.confirm_password}
          onChange={(e) => updateField('confirm_password', e.target.value)}
          placeholder="Re-enter your password"
          className={`w-full px-4 py-3 border rounded-lg bg-dark-elevated focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-transparent transition text-white placeholder:text-white/30 ${
            errors.confirm_password ? 'border-red-400' : 'border-dark-border'
          }`}
        />
        {fieldError('confirm_password')}
      </div>

      {/* Terms */}
      <div className="flex items-start gap-3">
        <input
          id="reg-terms"
          type="checkbox"
          checked={form.accept_terms}
          onChange={(e) => updateField('accept_terms', e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-dark-border bg-dark-elevated text-accent-pink focus:ring-accent-pink/50"
        />
        <label htmlFor="reg-terms" className="text-sm text-white/50 leading-snug">
          I agree to the{' '}
          <span className="text-accent-cyan font-medium">Terms of Service</span> and{' '}
          <span className="text-accent-cyan font-medium">Privacy Policy</span>
        </label>
      </div>
      {errors.accept_terms && (
        <p className="text-xs text-red-500 -mt-2">{errors.accept_terms}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-accent-pink text-white font-semibold rounded-lg hover:bg-accent-pink/90 active:bg-accent-pink/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-cyan font-medium hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
