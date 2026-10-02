'use client';

import React, { useRef } from 'react';
import { TAB_KEYS, type TabKey } from './lib';

export const TAB_LABELS: Record<TabKey, string> = {
  cuzdan: 'Hediye kartları',
  favoriler: 'Favoriler',
  iadeler: 'İadeler',
  adresler: 'Adresler',
  profil: 'Profil ve güvenlik',
  tercihler: 'İletişim tercihleri',
};

export const tabId = (tab: TabKey) => `account-tab-${tab}`;
export const panelId = (tab: TabKey) => `account-panel-${tab}`;

type AccountTabsProps = {
  active: TabKey;
  counts: Partial<Record<TabKey, number>>;
  onChange: (tab: TabKey) => void;
};

/** WAI-ARIA tabs with automatic activation: arrows, Home and End move between tabs. */
export default function AccountTabs({ active, counts, onChange }: AccountTabsProps) {
  const refs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  const move = (to: TabKey) => {
    onChange(to);
    refs.current[to]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = TAB_KEYS.indexOf(active);
    const last = TAB_KEYS.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    move(TAB_KEYS[next]);
  };

  return (
    <nav className="account-tabs" aria-label="Hesap bölümleri">
      <div role="tablist" aria-orientation="horizontal" className="account-tabs__list" onKeyDown={onKeyDown}>
        {TAB_KEYS.map((tab) => {
          const selected = tab === active;
          const count = counts[tab];
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={tabId(tab)}
              aria-selected={selected}
              aria-controls={panelId(tab)}
              tabIndex={selected ? 0 : -1}
              className="account-tab"
              onClick={() => onChange(tab)}
            >
              {TAB_LABELS[tab]}
              {count ? <span className="account-tab__count">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
