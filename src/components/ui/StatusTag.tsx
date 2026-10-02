import React from 'react';

type Tone = 'neutral' | 'progress' | 'success' | 'danger';

/** Status label: colour plus text, never colour alone. */
export default function StatusTag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`account-status account-status--${tone}`}>
      <span className="account-status__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
