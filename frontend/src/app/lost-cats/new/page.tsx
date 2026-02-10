import type { Metadata } from 'next';
import { LostCatForm } from '@/components/lost-cats/LostCatForm';

export const metadata: Metadata = {
  title: 'Report Lost Cat',
  description: 'Report a missing cat. We will alert nearby users in Malaysia to help find them.',
};

export default function ReportLostCatPage() {
  return (
    <div className="min-h-screen bg-white">
      <LostCatForm />
    </div>
  );
}
