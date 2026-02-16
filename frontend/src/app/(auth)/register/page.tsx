'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/feed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">MeowLah</h1>
          <p className="mt-2 text-sm text-white/50">
            Join Malaysia&apos;s cat community today.
          </p>
        </div>

        {/* Card */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>
          <RegisterForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
