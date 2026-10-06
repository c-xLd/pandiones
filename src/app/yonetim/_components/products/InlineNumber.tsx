'use client';

import React, { useEffect, useId, useState } from 'react';
import { errorText } from '../../_lib/request';

type State = 'idle' | 'saving' | 'saved' | 'error';

/**
 * A number edited in place (stock of one size, a product price). Saves on blur or Enter only when the value
 * changed and passes `validate`; Escape restores the saved value. Pending, saved and error states sit next to it.
 */
export default function InlineNumber({
  label,
  visibleLabel,
  value,
  step = 1,
  min = 0,
  suffix,
  validate,
  save,
  tone,
  badge,
  className,
}: {
  label: string;
  visibleLabel?: string;
  value: number;
  step?: number;
  min?: number;
  suffix?: string;
  validate(next: number, raw: string): string | null;
  save(next: number): Promise<void>;
  tone?: 'warning' | 'danger';
  badge?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setDraft(String(value)), [value]);

  useEffect(() => {
    if (state !== 'saved') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const commit = async () => {
    if (state === 'saving') return;
    const raw = draft.trim();
    const next = Number(raw);
    if (raw === String(value) || (raw !== '' && next === value)) {
      if (state === 'error') setState('idle');
      return;
    }
    const problem = raw === '' ? 'Bir değer girin.' : validate(next, raw);
    if (problem) {
      setState('error');
      setMessage(problem);
      return;
    }
    setState('saving');
    setMessage(null);
    try {
      await save(next);
      setState('saved');
    } catch (err) {
      setState('error');
      setMessage(errorText(err, 'Kaydedilemedi.'));
    }
  };

  return (
    <div className={['adm-inline', className].filter(Boolean).join(' ')} data-state={state} data-tone={tone}>
      <label htmlFor={id} className={visibleLabel ? 'adm-inline__label' : 'visually-hidden'}>
        {visibleLabel ?? label}
        {visibleLabel ? <span className="visually-hidden"> — {label}</span> : null}
      </label>
      <span className="adm-inline__control">
        <input
          id={id}
          type="number"
          inputMode={step < 1 ? 'decimal' : 'numeric'}
          min={min}
          step={step}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (state === 'error') setState('idle');
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setDraft(String(value));
              setState('idle');
            }
          }}
          readOnly={state === 'saving'}
          aria-busy={state === 'saving'}
          aria-invalid={state === 'error' || undefined}
          aria-describedby={state === 'error' ? `${id}-error` : undefined}
        />
        {suffix ? <span aria-hidden="true">{suffix}</span> : null}
      </span>
      {badge}
      <span className="adm-inline__state" aria-live="polite">
        {state === 'saving' ? 'Kaydediliyor' : state === 'saved' ? 'Kaydedildi' : ''}
      </span>
      {state === 'error' && message ? (
        <span id={`${id}-error`} className="adm-field-error" role="alert">
          {message}
        </span>
      ) : null}
    </div>
  );
}
