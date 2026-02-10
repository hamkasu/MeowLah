import type { Metadata } from 'next';
import { MemorialCreateForm } from '@/components/memorial/MemorialCreateForm';

export const metadata: Metadata = {
  title: 'Create Memorial',
  description: 'Create a lasting tribute for your beloved cat companion.',
};

export default function CreateMemorialPage() {
  return (
    <div className="min-h-screen bg-memorial-50">
      <MemorialCreateForm />
    </div>
  );
}
