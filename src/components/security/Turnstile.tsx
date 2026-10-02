'use client';

import React, { useEffect, useRef } from 'react';

type TurnstileApi = {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('turnstile'));
    document.head.appendChild(el);
  });
  return loading;
}

/** Whether forms must wait for a token before submitting. */
export const turnstileEnabled = Boolean(SITE_KEY);

/**
 * Cloudflare Turnstile widget (managed mode: usually invisible, a checkbox only when unsure).
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set; the server then skips the check too.
 * `resetKey` changes after a failed submit so a fresh token is fetched.
 */
export default function Turnstile({ onToken, action, resetKey = 0 }: { onToken(token: string | null): void; action: string; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widget.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          action,
          language: 'tr',
          appearance: 'interaction-only',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [action]);

  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) {
      callback.current(null);
      window.turnstile.reset(widget.current);
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="turnstile-slot" />;
}
