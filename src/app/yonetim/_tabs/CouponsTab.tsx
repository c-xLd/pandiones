'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { validateCouponInput } from '@/lib/orders/coupon-rules';
import { money } from '../_lib/format';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';

type Coupon = {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minSpend: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  perEmailLimit: number | null;
};

type Draft = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minSpend: string;
  maxUses: string;
  perEmailLimit: string;
  startsAt: string;
  expiresAt: string;
};

const EMPTY_DRAFT: Draft = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minSpend: '0',
  maxUses: '100',
  perEmailLimit: '1',
  startsAt: '',
  expiresAt: '',
};

const shortDate = (value: string) => new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

/** What a coupon does right now, from its own dates and quota — not only the isActive flag. */
function couponState(coupon: Coupon, now: number): { label: string; tone: 'success' | 'warning' | 'muted' } {
  if (!coupon.isActive) return { label: 'Kapalı', tone: 'muted' };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= now) return { label: 'Süresi doldu', tone: 'muted' };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { label: 'Kota doldu', tone: 'muted' };
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return { label: 'Başlamadı', tone: 'warning' };
  return { label: 'Geçerli', tone: 'success' };
}

function validityText(coupon: Coupon) {
  if (coupon.startsAt && coupon.expiresAt) return `${shortDate(coupon.startsAt)} – ${shortDate(coupon.expiresAt)}`;
  if (coupon.expiresAt) return `${shortDate(coupon.expiresAt)} tarihine kadar`;
  if (coupon.startsAt) return `${shortDate(coupon.startsAt)} tarihinden itibaren`;
  return 'Süresiz';
}

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { notice, success } = useTabNotice();
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setCoupons(await loadJson<Coupon[]>('/api/admin/coupons', 'Kuponlar yüklenemedi.', Array.isArray));
    } catch (error) {
      setLoadError(errorText(error, 'Kuponlar yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = (coupon: Coupon) =>
    ask({
      title: `${coupon.code} silinsin mi?`,
      message: (
        <p>
          Kod artık ödemede kabul edilmez. {coupon.usedCount > 0 ? `Bu kupon ${coupon.usedCount} siparişte kullanıldı; o siparişler değişmez.` : ''}
        </p>
      ),
      confirmLabel: 'Kuponu sil',
      pendingLabel: 'Siliniyor',
      danger: true,
      onConfirm: async () => {
        await sendJson('/api/admin/coupons', 'DELETE', { id: coupon.id }, 'Kupon silinemedi.');
        setCoupons((current) => current?.filter((item) => item.id !== coupon.id) ?? null);
        success(`${coupon.code} silindi.`);
      },
    });

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setCoupons(null); void load(); }} />;
  if (!coupons) return <TabLoading label="Kuponlar yükleniyor" />;

  const now = Date.now();
  return (
    <div className="adm-tab">
      <div className="adm-tab__head">
        <p className="adm-tab__summary">{coupons.length ? `${coupons.length} kupon` : 'Henüz kupon yok'}</p>
        <button type="button" className="adm-pill" onClick={() => setCreating(true)}>
          <span>Yeni kupon</span>
          <span className="adm-pill__icon" aria-hidden="true">
            <AdminIcon name="plus" />
          </span>
        </button>
      </div>

      {notice}

      {coupons.length === 0 ? (
        <p className="adm-empty">Tanımlı kupon yok. “Yeni kupon” ile ilk indirim kodunu oluşturun.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Kod</th>
                  <th scope="col">İndirim</th>
                  <th scope="col">En az sepet</th>
                  <th scope="col">Kullanım</th>
                  <th scope="col">Geçerlilik</th>
                  <th scope="col">Durum</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const state = couponState(coupon, now);
                  return (
                    <tr key={coupon.id}>
                      <td>
                        <code className="adm-code">{coupon.code}</code>
                      </td>
                      <td className="adm-cell__main">
                        {coupon.discountType === 'PERCENTAGE' ? `%${coupon.discountValue}` : money(coupon.discountValue)}
                      </td>
                      <td>{coupon.minSpend ? money(coupon.minSpend) : 'Koşulsuz'}</td>
                      <td>
                        <div className="adm-cell">
                          <span className="adm-num">
                            {coupon.usedCount} / {coupon.maxUses ?? '∞'}
                          </span>
                          <span className="adm-cell__sub">{coupon.perEmailLimit ? `Kişi başı ${coupon.perEmailLimit}` : 'Kişi başı sınırsız'}</span>
                        </div>
                      </td>
                      <td className="adm-cell__sub">{validityText(coupon)}</td>
                      <td>
                        <span className={`adm-status adm-status--${state.tone}`}>{state.label}</span>
                      </td>
                      <td className="adm-end">
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => remove(coupon)}>
                          <AdminIcon name="trash" />
                          <span>
                            Sil<span className="visually-hidden"> {coupon.code}</span>
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CouponDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(coupon) => {
          setCreating(false);
          setCoupons((current) => [coupon, ...(current ?? [])]);
          success(`${coupon.code} oluşturuldu.`);
        }}
      />
      {dialog}
    </div>
  );
}

function CouponDialog({ open, onClose, onCreated }: { open: boolean; onClose(): void; onCreated(coupon: Coupon): void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(EMPTY_DRAFT);
      setError(null);
      setPending(false);
    }
  }, [open]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  // datetime-local has no zone: send the instant the admin meant (Türkiye time) as ISO.
  const payload = () => ({
    ...draft,
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : '',
    expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : '',
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const checked = validateCouponInput(payload());
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await sendJson<{ coupon: Coupon }>('/api/admin/coupons', 'POST', payload(), 'Kupon oluşturulamadı.');
      onCreated(data.coupon);
    } catch (err) {
      setError(errorText(err, 'Kupon oluşturulamadı.'));
      setPending(false);
    }
  };

  const percent = draft.discountType === 'PERCENTAGE';
  return (
    <Dialog open={open} onClose={() => !pending && onClose()} title="Yeni kupon" className="adm-dialog">
      <form className="adm-form" onSubmit={submit} noValidate>
        <div className="adm-field">
          <label htmlFor="coupon-code">Kupon kodu</label>
          <input
            id="coupon-code"
            required
            autoComplete="off"
            spellCheck={false}
            maxLength={30}
            value={draft.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            aria-describedby="coupon-code-hint"
          />
          <p id="coupon-code-hint" className="adm-field__hint">
            3–30 karakter; harf, rakam ve tire. Örnek: BAHAR20
          </p>
        </div>

        <fieldset className="adm-field">
          <legend className="adm-field__legend">İndirim türü</legend>
          <div className="adm-segmented">
            <button type="button" aria-pressed={percent} onClick={() => set('discountType', 'PERCENTAGE')}>
              Yüzde
            </button>
            <button type="button" aria-pressed={!percent} onClick={() => set('discountType', 'FIXED')}>
              Tutar
            </button>
          </div>
        </fieldset>

        <div className="adm-form__grid">
          <div className="adm-field">
            <label htmlFor="coupon-value">{percent ? 'İndirim (%)' : 'İndirim (₺)'}</label>
            <input id="coupon-value" type="number" inputMode="decimal" min={percent ? 1 : 0} max={percent ? 90 : undefined} required value={draft.discountValue} onChange={(e) => set('discountValue', e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="coupon-min">En az sepet (₺)</label>
            <input id="coupon-min" type="number" inputMode="decimal" min={0} value={draft.minSpend} onChange={(e) => set('minSpend', e.target.value)} aria-describedby="coupon-min-hint" />
            <p id="coupon-min-hint" className="adm-field__hint">0 = koşulsuz</p>
          </div>
          <div className="adm-field">
            <label htmlFor="coupon-max">Toplam kullanım</label>
            <input id="coupon-max" type="number" inputMode="numeric" min={1} value={draft.maxUses} onChange={(e) => set('maxUses', e.target.value)} aria-describedby="coupon-max-hint" />
            <p id="coupon-max-hint" className="adm-field__hint">Boş = sınırsız</p>
          </div>
          <div className="adm-field">
            <label htmlFor="coupon-per-email">Kişi başı kullanım</label>
            <input id="coupon-per-email" type="number" inputMode="numeric" min={1} max={100} value={draft.perEmailLimit} onChange={(e) => set('perEmailLimit', e.target.value)} aria-describedby="coupon-per-email-hint" />
            <p id="coupon-per-email-hint" className="adm-field__hint">Boş = sınırsız</p>
          </div>
          <div className="adm-field">
            <label htmlFor="coupon-starts">Başlangıç</label>
            <input id="coupon-starts" type="datetime-local" value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="coupon-expires">Bitiş</label>
            <input id="coupon-expires" type="datetime-local" value={draft.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
          </div>
        </div>

        {error ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={pending} aria-busy={pending}>
            {pending ? 'Oluşturuluyor' : 'Kuponu oluştur'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
