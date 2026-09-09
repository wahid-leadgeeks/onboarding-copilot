'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NovaLogo } from '@/app/components/NovaLogo';
import {
  IconBook,
  IconCalendar,
  IconFileText,
  IconMenu,
  IconSearch,
  IconSettings,
  IconStar,
  IconSun,
  IconTree,
  IconTrophy,
  IconX,
} from '@/app/components/Icons';

import { GuideTour, allPagesTourSteps } from '@/app/components/GuideTour';
import { GUIDE_TOUR_STORAGE_KEY, readGuideTourState, writeGuideTourState } from '@/lib/guide-tour';

interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly badge?: string;
  readonly tourId?: string;
}

interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Daily Execution',
    items: [
      { label: 'Today', href: '/', icon: IconSun, tourId: 'nav-today' },
      { label: 'Schedule', href: '/schedule', icon: IconCalendar, tourId: 'nav-schedule' },
    ],
  },
  {
    title: 'Milestones & Growth',
    items: [
      { label: 'Timeline', href: '/timeline', icon: IconTree, tourId: 'nav-timeline' },
      { label: 'Reviews', href: '/reviews', icon: IconTrophy, tourId: 'nav-reviews' },
    ],
  },
  {
    title: 'Reflections & Input',
    items: [
      { label: 'Diary', href: '/diary', icon: IconFileText, tourId: 'nav-diary' },
      { label: 'Feedback', href: '/feedback', icon: IconStar, tourId: 'nav-feedback' },
    ],
  },
  {
    title: 'System & Knowledge',
    items: [
      { label: 'Glossary', href: '/glossary', icon: IconBook, tourId: 'nav-glossary' },
      { label: 'Settings', href: '/settings', icon: IconSettings, tourId: 'nav-settings' },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Check tour parameter or first-time visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === 'start') {
      params.delete('tour');
      const query = params.toString();
      window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
      setTourOpen(true);
      return;
    }
    if (params.get('tour') === 'skip' || params.get('tour') === 'false') {
      return;
    }
    const tourState = readGuideTourState(localStorage.getItem(GUIDE_TOUR_STORAGE_KEY));
    if (!tourState?.completed) setTourOpen(true);
  }, []);

  // Listen for open-guide-tour event (e.g. from CommandPalette or buttons)
  useEffect(() => {
    function handleOpenTour() {
      setTourOpen(true);
    }
    window.addEventListener('open-guide-tour', handleOpenTour);
    return () => window.removeEventListener('open-guide-tour', handleOpenTour);
  }, []);

  function handleTourFinish() {
    localStorage.setItem(
      GUIDE_TOUR_STORAGE_KEY,
      writeGuideTourState({ completed: true, completedAt: new Date().toISOString() })
    );
    setTourOpen(false);
  }

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const isLinkActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Find active label for mobile header
  const allItems = NAV_SECTIONS.flatMap((s) => s.items);
  const currentItem = allItems.find((i) => isLinkActive(i.href)) || { label: 'Today' };

  const triggerSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <div className="flex min-h-screen bg-[#fafaf7] text-stone-900">
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR (Visible on md and above)                      */}
      {/* ============================================================ */}
      <aside
        data-tour="primary-nav"
        aria-label="Primary navigation"
        className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-stone-200/70 bg-white shadow-2xs"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <Link href="/" className="group flex items-center gap-2.5">
            <NovaLogo className="size-6 transition-transform group-hover:scale-110" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-[0.16em] text-stone-900">
                  NOVA
                </span>
                <span className="rounded bg-mint-50 px-1.5 py-0.2 text-[9px] font-bold text-mint-700 uppercase tracking-wider">
                  v3
                </span>
              </div>
              <p className="text-[10px] font-medium text-stone-400 tracking-wide">
                Onboarding Cockpit
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Search Trigger */}
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={triggerSearch}
            className="flex w-full items-center justify-between gap-2 rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3 py-2 text-xs text-stone-500 hover:border-stone-300 hover:bg-white hover:text-stone-800 transition shadow-2xs active:scale-98"
            title="Search activities, topics, and guides (⌘K)"
          >
            <div className="flex items-center gap-2">
              <IconSearch className="h-3.5 w-3.5 text-stone-400" />
              <span>Quick search...</span>
            </div>
            <kbd className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-600">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isLinkActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      data-tour={item.tourId}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? 'bg-stone-900 text-white font-semibold shadow-xs'
                          : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            active ? 'text-white' : 'text-stone-400 group-hover:text-stone-700'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {active && (
                        <span className="size-1.5 rounded-full bg-mint-400 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Cockpit Status & Tour */}
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-mint-500 animate-pulse" />
              <span className="text-[11px] font-medium text-stone-600">
                Local-First Mode
              </span>
            </div>
            <Link
              href="/settings"
              className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 transition"
              title="Configure Google Sheets Connection"
            >
              Sync →
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-stone-200/80 bg-white py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs cursor-pointer active:scale-98"
          >
            <span>🧭 Quick Guide Tour</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE STICKY TOP BAR (Visible below md)                       */}
      {/* ============================================================ */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 border-b border-stone-200/70 bg-[#fafaf7]/90 backdrop-blur-md px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <NovaLogo className="size-5" />
          <span className="text-sm font-bold tracking-[0.16em] text-stone-900">
            NOVA
          </span>
          <span className="text-stone-300">/</span>
          <span className="text-xs font-semibold text-stone-700">
            {currentItem.label}
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={triggerSearch}
            className="flex size-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition"
            aria-label="Search"
          >
            <IconSearch className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex size-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition"
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MOBILE SLIDE-OVER DRAWER (Visible below md when open)          */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
          className="md:hidden fixed inset-0 z-50 overflow-hidden"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 flex max-w-full pr-10">
            <div className="w-screen max-w-xs flex flex-col bg-white shadow-lift animate-fade-in">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <NovaLogo className="size-5" />
                  <span className="text-base font-bold tracking-[0.16em] text-stone-900">
                    NOVA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                  aria-label="Close menu"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1.5">
                    <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {section.title}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isLinkActive(item.href);
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                              active
                                ? 'bg-stone-900 text-white font-semibold'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                className={`h-4 w-4 ${
                                  active ? 'text-white' : 'text-stone-400'
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>
                            {active && (
                              <span className="size-1.5 rounded-full bg-mint-400" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="border-t border-stone-100 p-4 bg-stone-50/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-mint-500" />
                    Local-First Cockpit
                  </span>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-semibold text-stone-700 hover:underline"
                  >
                    Settings
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTourOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-stone-200/80 bg-white py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs cursor-pointer active:scale-98"
                >
                  <span>🧭 Quick Guide Tour</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA                                            */}
      {/* ============================================================ */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Mobile top spacing buffer */}
        <div className="h-14 md:hidden" />
        <div className="flex-1 w-full">
          {children}
        </div>
      </div>

      <GuideTour steps={allPagesTourSteps} open={tourOpen} onFinish={handleTourFinish} />
    </div>
  );
}
