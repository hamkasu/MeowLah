'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth-store';

export function BottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  // Hide nav on auth pages
  if (pathname === '/login' || pathname === '/register') return null;

  const profileHref = isAuthenticated && user ? `/profile/${user.username}` : '/profile';
  const isFeedPage = pathname === '/feed' || pathname === '/';

  return (
    <nav className={clsx(
      'fixed bottom-0 left-0 right-0 z-50 safe-area-bottom',
      isFeedPage ? 'bg-black/80 backdrop-blur-md border-t border-white/5' : 'bg-dark-card border-t border-dark-border'
    )}>
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {/* Home */}
        <NavLink href="/feed" label="Home" active={pathname === '/feed' || pathname === '/'}>
          <HomeIcon filled={pathname === '/feed' || pathname === '/'} />
        </NavLink>

        {/* Discover */}
        <NavLink href="/explore" label="Discover" active={pathname?.startsWith('/explore')}>
          <SearchIcon filled={pathname?.startsWith('/explore')} />
        </NavLink>

        {/* Create - TikTok's signature center button */}
        <Link
          href={isAuthenticated ? '/feed/create' : '/login'}
          className="flex items-center justify-center -mt-1"
        >
          <div className="relative w-12 h-8 flex items-center justify-center">
            {/* Cyan background layer */}
            <div className="absolute left-0 top-0 w-[38px] h-full rounded-lg bg-accent-cyan" />
            {/* Pink background layer */}
            <div className="absolute right-0 top-0 w-[38px] h-full rounded-lg bg-accent-pink" />
            {/* White center */}
            <div className="relative z-10 w-[38px] h-full rounded-lg bg-white flex items-center justify-center">
              <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </div>
        </Link>

        {/* CatFinder */}
        <NavLink href="/lost-cats" label="CatSOS" active={pathname?.startsWith('/lost-cats')}>
          <MapPinIcon filled={pathname?.startsWith('/lost-cats')} />
        </NavLink>

        {/* Profile */}
        <NavLink href={profileHref} label="Me" active={pathname?.startsWith('/profile') || pathname?.startsWith('/memorial')}>
          <UserIcon filled={pathname?.startsWith('/profile') || pathname?.startsWith('/memorial')} />
        </NavLink>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[10px] transition-colors',
        active ? 'text-white' : 'text-white/50'
      )}
    >
      <div className="w-6 h-6">{children}</div>
      <span>{label}</span>
    </Link>
  );
}

function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function SearchIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.5 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function MapPinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function UserIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
