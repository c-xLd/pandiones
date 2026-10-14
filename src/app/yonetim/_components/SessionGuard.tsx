'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type Deadlines = { expiresAt: number; idleExpiresAt: number };
export type SessionEndReason = 'idle' | 'expired';

const WARN_MS = 2 * 60 * 1000; // warning dialog this long before the end
const RENEW_EVERY_MS = 60 * 1000; // at most one renewal per minute while the panel is used
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Keeps the admin session's 30-minute inactivity window alive while the panel is used, warns two
 * minutes before the session ends and signs out when it does. The server enforces the same
 * deadlines on every request (src/lib/auth.ts); this only makes them visible and renews them.
 */
export default function SessionGuard({ onEnd }: { onEnd(reason: SessionEndReason): void }) {
  const [deadlines, setDeadlines] = useState<Deadlines | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [renewing, setRenewing] = useState(false);
  const lastActivity = useRef(Date.now());
  const lastRenew = useRef(0);
  const ending = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);

  const apply = (data: { expiresAt: number | null; idleExpiresAt: number | null }) => {
    if (data.expiresAt && data.idleExpiresAt) setDeadlines({ expiresAt: data.expiresAt, idleExpiresAt: data.idleExpiresAt });
  };

  // The parent may pass a new onEnd on every render; keep it in a ref so `end` and `renew` stay stable and
  // the open-the-panel renewal below runs once, not on every re-render (tab switch).
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const end = useCallback((reason: SessionEndReason) => {
    if (ending.current) return;
    ending.current = true;
    onEndRef.current(reason);
  }, []);

  const renew = useCallback(async () => {
    lastRenew.current = Date.now();
    setRenewing(true);
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', cache: 'no-store' });
      if (response.status === 401) {
        end('idle');
        return;
      }
      if (response.ok) apply(await response.json());
    } catch {
      // Offline for a moment: the next activity tries again; the server still enforces the deadline.
    } finally {
      setRenewing(false);
    }
  }, [end]);

  // Opening the panel counts as activity.
  useEffect(() => {
    void renew();
  }, [renew]);

  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, mark, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, mark));
  }, []);

  const endAt = deadlines ? Math.min(deadlines.idleExpiresAt, deadlines.expiresAt) : null;
  const remaining = endAt === null ? null : endAt - now;
  const warning = remaining !== null && remaining <= WARN_MS;
  const hardLimit = deadlines ? deadlines.expiresAt <= deadlines.idleExpiresAt : false;

  // One clock: every second while warning, otherwise every 15 s.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), warning ? 1000 : 15000);
    return () => window.clearInterval(id);
  }, [warning]);

  useEffect(() => {
    if (!deadlines || remaining === null) return;
    if (remaining <= 0) {
      // Another tab may have renewed the cookie; ask the server before signing out.
      fetch('/api/auth/session', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) return end(hardLimit ? 'expired' : 'idle');
          const data = await response.json();
          if (Math.min(data.idleExpiresAt, data.expiresAt) > Date.now()) apply(data);
          else end(hardLimit ? 'expired' : 'idle');
        })
        .catch(() => end(hardLimit ? 'expired' : 'idle'));
      return;
    }
    // Used recently and not yet in the warning: quietly move the inactivity window forward.
    if (!warning && !hardLimit && lastActivity.current > lastRenew.current && Date.now() - lastRenew.current > RENEW_EVERY_MS) {
      void renew();
    }
  }, [now, deadlines, remaining, warning, hardLimit, end, renew]);

  useEffect(() => {
    if (warning) continueRef.current?.focus();
  }, [warning]);

  if (!warning || remaining === null) return null;

  return (
    <div className="adm-session" role="alertdialog" aria-modal="true" aria-labelledby="adm-session-title" aria-describedby="adm-session-desc">
      <div className="adm-session__card">
        <span className="adm-eyebrow">Oturum</span>
        <h2 id="adm-session-title">{hardLimit ? 'Oturum süresi doluyor' : 'Hâlâ burada mısınız?'}</h2>
        <p id="adm-session-desc">
          {hardLimit
            ? 'Yönetim oturumları en fazla 8 saat açık kalır. Kaydetmediğiniz bir şey varsa şimdi kaydedin; süre bitince yeniden giriş yapmanız gerekecek.'
            : '30 dakikadır işlem yapılmadı. Güvenliğiniz için oturum kapanmak üzere.'}
        </p>
        <p className="adm-session__clock" aria-live="polite">
          <span className="visually-hidden">Kalan süre </span>
          {clock(remaining)}
        </p>
        <div className="adm-session__actions">
          <button ref={hardLimit ? continueRef : undefined} type="button" className="adm-btn" onClick={() => end(hardLimit ? 'expired' : 'idle')}>
            Çıkış yap
          </button>
          {hardLimit ? null : (
            <button ref={continueRef} type="button" className="adm-btn adm-btn--primary" onClick={() => void renew()} disabled={renewing}>
              {renewing ? 'Sürdürülüyor' : 'Oturumu sürdür'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
