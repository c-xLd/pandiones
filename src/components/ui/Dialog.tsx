'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  size?: 'md' | 'lg';
  className?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal dialog: focus moves in, Tab stays inside, Escape and the close button close it,
 *  the page behind does not scroll, and focus returns to the opener. See DESIGN.md "Modal/çekmece". */
export default function Dialog({ open, onClose, title, eyebrow, size = 'md', className, headerActions, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]), textarea:not([disabled])');
    (firstField ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  // Portal to <body> so transformed/animated ancestors cannot trap the fixed backdrop.
  return createPortal(
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className={['dialog', `dialog--${size}`, className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="dialog__head">
          <div>
            {eyebrow ? <p className="dialog__eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId} className="dialog__title">{title}</h2>
          </div>
          <div className="dialog__head-actions">
            {headerActions}
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Kapat" onClick={onClose}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </header>
        <div className="dialog__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
