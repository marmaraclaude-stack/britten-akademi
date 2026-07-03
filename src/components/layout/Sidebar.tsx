'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Wallet,
  UserCircle2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Brand } from './Brand';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  students: Users,
  calendar: Calendar,
  homework: ClipboardList,
  materials: BookOpen,
  messages: MessageSquare,
  progress: TrendingUp,
  exam: GraduationCap,
  words: Sparkles,
  profile: UserCircle2,
  finance: Wallet,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
}

function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3" aria-label="Ana menü">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active =
          pathname === item.href ||
          (item.href.split('/').length > 2 && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-800 text-white'
                : 'text-brand-200 hover:bg-brand-800/60 hover:text-white'
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-accent-400"
              />
            ) : null}
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-accent-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Uygulama kabuğu: masaüstünde sabit koyu lacivert kenar çubuğu,
 * mobilde üst çubuk + açılır menü.
 * `footer` sunucudan gelir (kullanıcı kartı + çıkış formu).
 */
export function AppShell({
  items,
  footer,
  children,
}: {
  items: NavItem[];
  footer: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const sidebarInner = (
    <>
      <div className="px-5 pb-6 pt-6">
        <Brand onDark />
      </div>
      <NavLinks items={items} onNavigate={() => setOpen(false)} />
      <div className="mt-auto border-t border-brand-800 p-4">{footer}</div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Masaüstü kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-950 lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobil üst çubuk */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-surface px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
          className="rounded-lg p-2 text-ink-secondary hover:bg-plane"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobil çekmece */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-brand-950/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-950 shadow-raised">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
              className="absolute right-3 top-5 rounded-lg p-1.5 text-brand-300 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {sidebarInner}
          </div>
        </div>
      ) : null}

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-8 lg:py-8 xl:px-10">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
