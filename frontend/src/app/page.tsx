import { redirect } from 'next/navigation';

// Root page redirects to the feed
export default function Home() {
  redirect('/feed');
}
