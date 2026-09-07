'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { OFFICIAL_SCHEDULE_ACTIVITIES, type ScheduleActivity } from '@/lib/schedule-catalog';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActivity?: (activity: ScheduleActivity) => void;
  onOpenQuickNote?: () => void;
}

export interface CommandItem {
  id: string;
  title: string;
  category: 'Pages' | 'Actions' | 'Schedule Topics';
  badge?: string;
  keywords?: string;
  onSelect: () => void;
}

export function filterCommands(commands: CommandItem[], query: string): CommandItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return commands;
  return commands.filter((cmd) => {
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.keywords && cmd.keywords.toLowerCase().includes(q)) ||
      (cmd.badge && cmd.badge.toLowerCase().includes(q))
    );
  });
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectActivity,
  onOpenQuickNote,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global key listener for ⌘K and ?
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))
      ) {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          const event = new CustomEvent('open-command-palette');
          window.dispatchEvent(event);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Define commands
  const pageCommands: CommandItem[] = [
    {
      id: 'page-schedule',
      title: 'Schedule (Cockpit)',
      category: 'Pages',
      badge: '1',
      onSelect: () => router.push('/'),
    },
    {
      id: 'page-timeline',
      title: 'Timeline (90-Day Journey)',
      category: 'Pages',
      badge: '2',
      onSelect: () => router.push('/timeline'),
    },
    {
      id: 'page-diary',
      title: 'Diary (Onboarding Learnings)',
      category: 'Pages',
      badge: '3',
      onSelect: () => router.push('/diary'),
    },
    {
      id: 'page-feedback',
      title: 'Feedback (Weekly Reflections)',
      category: 'Pages',
      badge: '4',
      onSelect: () => router.push('/feedback'),
    },
    {
      id: 'page-reviews',
      title: 'Reviews (Evaluation Milestones)',
      category: 'Pages',
      badge: '5',
      onSelect: () => router.push('/reviews'),
    },
    {
      id: 'page-glossary',
      title: 'Glossary (Knowledge Modules & Links)',
      category: 'Pages',
      badge: '6',
      onSelect: () => router.push('/glossary'),
    },
    {
      id: 'page-settings',
      title: 'Settings (Preferences & OAuth Sync)',
      category: 'Pages',
      badge: '7',
      onSelect: () => router.push('/settings'),
    },
  ];

  const actionCommands: CommandItem[] = [
    ...(onOpenQuickNote
      ? [
          {
            id: 'action-quick-note',
            title: 'Take Quick Note',
            category: 'Actions' as const,
            badge: 'N',
            onSelect: onOpenQuickNote,
          },
        ]
      : []),
    {
      id: 'action-sync',
      title: 'Check Google Sheets Status',
      category: 'Actions',
      onSelect: () => router.push('/settings'),
    },
  ];

  const scheduleCommands: CommandItem[] = OFFICIAL_SCHEDULE_ACTIVITIES.slice(0, 30).map((act) => ({
    id: act.id,
    title: act.topic.split('\n')[0],
    category: 'Schedule Topics',
    badge: `Row ${act.rowNumber}`,
    keywords: `${act.pic} ${act.week} ${act.day}`,
    onSelect: () => {
      if (onSelectActivity) {
        onSelectActivity(act);
      } else {
        router.push('/');
      }
    },
  }));

  const allCommands = [...pageCommands, ...actionCommands, ...scheduleCommands];

  const filteredCommands = filterCommands(allCommands, query);

  // Keyboard navigation inside palette
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredCommands[selectedIndex];
      if (item) {
        item.onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-pop-in border border-stone-100">
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
          <span className="text-base text-stone-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search topics..."
            className="w-full text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
            ESC
          </kbd>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-2 max-h-[60vh]">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No matching commands or topics found.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-medium cursor-pointer transition ${
                    isSelected ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 w-16">
                      {item.category === 'Schedule Topics' ? 'Topic' : item.category}
                    </span>
                    <span className="truncate text-stone-900 font-semibold">{item.title}</span>
                  </div>

                  {item.badge && (
                    <span className="rounded-md bg-stone-200/80 px-2 py-0.5 text-[10px] font-mono font-bold text-stone-700 shrink-0 ml-2">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/50 px-4 py-2.5 text-[11px] text-stone-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-semibold text-stone-600">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-semibold text-stone-600">↵</kbd> to select
            </span>
          </div>
          <span>
            Press <kbd className="font-semibold text-stone-600">?</kbd> anytime for commands
          </span>
        </div>
      </div>
    </div>
  );
}
