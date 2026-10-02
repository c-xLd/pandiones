'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import FormField from '@/components/ui/FormField';
import Notice from '@/components/ui/Notice';
import { formatDate, type Order } from '@/lib/orders';
// Route stylesheet: loaded only where this page or component is used.
import '@/styles/pages/account.css';
import '@/styles/pages/orders.css';

type ReturnDialogProps = {
  order: Order | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export default function ReturnDialog({ order, onClose, onCreated }: ReturnDialogProps) {
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason('');
    setFieldError(null);
    setFormError(null);
    setSuccess(null);
  }, [order?.id]);

  if (!order) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!reason.trim()) {
      setFieldError('İade nedenini yazın.');
      return;
    }
    setFieldError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'İade talebi oluşturulamadı. Tekrar deneyin.');
        return;
      }
      setSuccess(data.message || 'İade talebiniz alındı. İnceleme sonucu e-posta ile bildirilecek.');
      await onCreated();
    } catch {
      setFormError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} eyebrow={`Sipariş ${order.orderNumber} · ${formatDate(order.createdAt)}`} title="İade talebi">
      {success ? (
        <div className="dialog-result">
          <Notice tone="success" role="status">
            <p>{success}</p>
          </Notice>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose} data-autofocus>
            Kapat
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <Notice tone="info" className="dialog-notice">
            <p>
              Hijyen gereği; koruyucu bandı çıkarılmış, denenmiş veya ambalajı açılmış iç giyim parçalarının iadesi kabul edilmez.
            </p>
          </Notice>

          {formError ? (
            <p className="form-alert form-alert--error" role="alert">{formError}</p>
          ) : null}

          <FormField id="return-reason" label="İade nedeni" required error={fieldError ?? undefined} hint="Hangi parçayı ve neden iade etmek istediğinizi yazın.">
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (fieldError) setFieldError(null);
              }}
            />
          </FormField>

          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn btn--primary" aria-busy={submitting || undefined} disabled={submitting}>
              Talebi gönder
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
