'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/feed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 tracking-tight">MeowLah</h1>
          <p className="mt-2 text-sm text-gray-500">
            Join Malaysia&apos;s cat community today.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>
          <RegisterForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
