import Link from 'next/link';
import { BookOpen, CalendarDays, Home, Trophy } from 'lucide-react';
import { signOut } from '@/app/actions';

const NAV = [
  { href: '/', label: 'Path', Icon: Home },
  { href: '/milestones', label: 'Milestones', Icon: Trophy },
  { href: '/history', label: 'History', Icon: CalendarDays },
  { href: '/growing', label: 'Growing', Icon: BookOpen },
] as const;

export function Shell({ children, active }: { children: React.ReactNode; active: string }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
      {children}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-md justify-around px-2 py-1.5">
          {NAV.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active === href ? 'page' : undefined}
                className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-xs ${
                  active === href ? 'bg-sage-mist font-medium text-forest' : 'text-forest/60'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="text-sm text-forest/60 underline underline-offset-4">Sign out</button>
    </form>
  );
}
