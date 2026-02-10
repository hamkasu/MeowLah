import type { Metadata } from 'next';
import { MemorialWall } from '@/components/memorial/MemorialWall';

export const metadata: Metadata = {
  title: 'Cat Memorial Garden',
  description: 'A quiet space to remember the cats who filled our lives with love.',
};

export default function MemorialWallPage() {
  return <MemorialWall />;
}
