'use client';

import React, { useCallback, useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { errorText } from '../_lib/request';

export type ConfirmRequest = {
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  danger?: boolean;
  /** Runs the action. Throw to keep the dialog open with the message. */
  onConfirm: () => Promise<void>;
};

function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose(): void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await request.onConfirm();
      onClose();
    } catch (err) {
      setError(errorText(err, 'İşlem tamamlanamadı. Tekrar deneyin.'));
      setPending(false);
    }
  };

  return (
    <Dialog open onClose={() => !pending && onClose()} title={request.title} className="adm-dialog adm-dialog--confirm">
      {request.message ? <div className="adm-dialog__lead">{request.message}</div> : null}
      {error ? (
        <p className="adm-field-error adm-dialog__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="adm-dialog__actions">
        <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
          Vazgeç
        </button>
        <button
          type="button"
          className={`adm-btn ${request.danger ? 'adm-btn--danger' : 'adm-btn--primary'}`}
          onClick={run}
          disabled={pending}
          aria-busy={pending}
          data-autofocus
        >
          {pending ? request.pendingLabel ?? 'İşleniyor' : request.confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

/** confirm() replacement: `ask({...})` opens the dialog; render `dialog` once in the tab. */
export function useConfirm() {
  const [request, setRequest] = useState<(ConfirmRequest & { key: number }) | null>(null);
  const counter = useRef(0);
  const ask = useCallback((next: ConfirmRequest) => setRequest({ ...next, key: ++counter.current }), []);
  const dialog = request ? <ConfirmDialog key={request.key} request={request} onClose={() => setRequest(null)} /> : null;
  return { ask, dialog };
}
