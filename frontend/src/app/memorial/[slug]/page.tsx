import type { Metadata } from 'next';
import { MemorialPage } from '@/components/memorial/MemorialPage';

// Server-side data fetching for SEO — memorial pages are shareable
// Uses Railway internal networking when available (avoids public round-trip)
const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO (Open Graph, Twitter cards)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/memorials/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'Memorial | MeowLah' };
    const memorial = await res.json();

    return {
      title: `In Memory of ${memorial.cat_name}`,
      description: memorial.life_story?.slice(0, 160) || `A tribute to ${memorial.cat_name}`,
      openGraph: {
        title: `In Memory of ${memorial.cat_name} | MeowLah`,
        description: memorial.life_story?.slice(0, 160),
        images: memorial.cat_photo_url ? [{ url: memorial.cat_photo_url }] : [],
        type: 'article',
      },
    };
  } catch {
    return { title: 'Memorial | MeowLah' };
  }
}

export default async function MemorialSlugPage({ params }: PageProps) {
  const { slug } = await params;

  try {
    // Fetch memorial data, condolences, and tributes in parallel
    const [memorialRes, condolencesRes, tributesRes] = await Promise.all([
      fetch(`${API_URL}/memorials/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/memorials/${slug}/condolences?limit=50`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/memorials/${slug}/tributes?limit=50`, { next: { revalidate: 60 } }),
    ]);

    if (!memorialRes.ok) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-memorial-50">
          <div className="text-center">
            <p className="text-4xl mb-4">🕊️</p>
            <h1 className="text-xl font-semibold text-memorial-700">Memorial Not Found</h1>
            <p className="text-sm text-memorial-400 mt-2">
              This memorial may have been set to private or removed.
            </p>
          </div>
        </div>
      );
    }

    const memorial = await memorialRes.ok ? memorialRes.json() : null;
    const condolencesData = condolencesRes.ok ? await condolencesRes.json() : { data: [] };
    const tributesData = tributesRes.ok ? await tributesRes.json() : { data: [] };

    return (
      <MemorialPage
        memorial={memorial}
        condolences={condolencesData.data || []}
        tributes={tributesData.data || []}
      />
    );
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-memorial-50">
        <div className="text-center">
          <p className="text-4xl mb-4">🕊️</p>
          <h1 className="text-xl font-semibold text-memorial-700">Something went wrong</h1>
          <p className="text-sm text-memorial-400 mt-2">Please try again later.</p>
        </div>
      </div>
    );
  }
}
