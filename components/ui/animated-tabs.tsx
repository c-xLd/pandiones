'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: AnimatedTabsProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--m-border,rgba(17,16,15,0.16))] bg-[var(--m-card-bg,#dfd7cb)] p-1.5',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all duration-300',
              isActive
                ? 'bg-[var(--m-fg,#11100f)] text-[var(--m-bg,#f1ede4)] shadow-md'
                : 'text-inherit opacity-60 hover:opacity-100 hover:bg-[rgba(0,0,0,0.05)]'
            )}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-[8px] opacity-75">({tab.count})</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
