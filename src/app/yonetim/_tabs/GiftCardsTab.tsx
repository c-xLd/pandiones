'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { money } from '../_lib/format';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';

type GiftCardUsage = {
  id: string;
  amount: number;
  usedAt: string;
  order?: { id: string; orderNumber: string; customerName: string; totalAmount: number };
};

type GiftCard = {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  theme: string;
  recipientName: string;
  recipientEmail: string;
  senderName?: string | null;
  giftNote?: string | null;
  isDelivered: boolean;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  usages?: GiftCardUsage[];
};

const THEMES = [
  { value: 'noir', label: 'Noir' },
  { value: 'pearl', label: 'Pearl' },
  { value: 'rose', label: 'Rose' },
] as const;

const themeLabel = (value: string) => THEMES.find((theme) => theme.value === value)?.label ?? value;
const shortDate = (value: string) => new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GiftCardsTab() {
  const [cards, setCards] = useState<GiftCard[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<GiftCard | null>(null);
  const [creating, setCreating] = useState(false);
  const { notice, success, error } = useTabNotice();
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setCards(await loadJson<GiftCard[]>('/api/admin/gift-cards', 'Hediye kartları yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'Hediye kartları yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (card: GiftCard) =>
    ask({
      title: card.isActive ? `${card.code} dondurulsun mu?` : `${card.code} yeniden açılsın mı?`,
      message: card.isActive ? (
        <p>Kart ödemede kabul edilmez; kalan {money(card.currentBalance)} bakiye korunur ve kart yeniden açılabilir.</p>
      ) : (
        <p>Kart ödemede yeniden kullanılabilir hale gelir.</p>
      ),
      confirmLabel: card.isActive ? 'Kartı dondur' : 'Kartı aç',
      pendingLabel: 'Kaydediliyor',
      danger: card.isActive,
      onConfirm: async () => {
        const data = await sendJson<{ giftCard: GiftCard }>('/api/admin/gift-cards', 'PATCH', { id: card.id, isActive: !card.isActive }, 'Durum güncellenemedi.');
        setCards((current) => current?.map((item) => (item.id === card.id ? { ...item, isActive: data.giftCard.isActive } : item)) ?? null);
        success(`${card.code} ${data.giftCard.isActive ? 'açıldı' : 'donduruldu'}.`);
      },
    });

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setCards(null); void load(); }} />;
  if (!cards) return <TabLoading label="Hediye kartları yükleniyor" />;

  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const visible = needle
    ? cards.filter((card) => [card.code, card.recipientName, card.recipientEmail].some((value) => value.toLocaleLowerCase('tr-TR').includes(needle)))
    : cards;
  const now = Date.now();

  return (
    <div className="adm-tab">
      <div className="adm-toolbar">
        {cards.length > 0 ? (
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Kart kodu, alıcı adı veya e-posta ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Kod, alıcı veya e-posta" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        ) : (
          <p className="adm-tab__summary adm-toolbar__grow">Henüz hediye kartı yok</p>
        )}
        <div className="adm-toolbar__end">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setCreating(true)}>
            <AdminIcon name="plus" />
            <span>Hediye kartı tanımla</span>
          </button>
        </div>
      </div>

      {notice}

      {cards.length === 0 ? (
        <p className="adm-empty">Satın alınan ve tanımlanan hediye kartları burada listelenir.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">“{search}” ile eşleşen kart yok.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <caption>{needle ? `${visible.length} / ${cards.length} kart` : `${cards.length} kart`}</caption>
              <thead>
                <tr>
                  <th scope="col">Kod</th>
                  <th scope="col">Alıcı</th>
                  <th scope="col">Gönderen</th>
                  <th scope="col" className="adm-num">Bakiye</th>
                  <th scope="col">Tema</th>
                  <th scope="col">Son geçerlilik</th>
                  <th scope="col">Durum</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((card) => {
                  const expired = new Date(card.expiresAt).getTime() < now;
                  const usageCount = card.usages?.length ?? 0;
                  return (
                    <tr key={card.id}>
                      <td>
                        <div className="adm-cell">
                          <code className="adm-code">{card.code}</code>
                          <span className="adm-cell__sub">{card.isDelivered ? 'E-posta gönderildi' : 'E-posta gönderilmedi'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="adm-cell">
                          <span className="adm-cell__main">{card.recipientName}</span>
                          <span className="adm-cell__sub">{card.recipientEmail}</span>
                        </div>
                      </td>
                      <td>
                        <div className="adm-cell adm-cell--clamp">
                          <span>{card.senderName || '—'}</span>
                          {card.giftNote ? <span className="adm-cell__sub">“{card.giftNote}”</span> : null}
                        </div>
                      </td>
                      <td className="adm-num">
                        <div className="adm-cell">
                          <span className="adm-cell__main">{money(card.currentBalance)}</span>
                          <span className="adm-cell__sub">/ {money(card.initialBalance)}</span>
                        </div>
                      </td>
                      <td>{themeLabel(card.theme)}</td>
                      <td>
                        <div className="adm-cell">
                          <span>{shortDate(card.expiresAt)}</span>
                          {expired ? <span className="adm-cell__sub adm-text-danger">Süresi doldu</span> : null}
                        </div>
                      </td>
                      <td>
                        <span className={`adm-status adm-status--${card.isActive ? 'success' : 'muted'}`}>{card.isActive ? 'Açık' : 'Donduruldu'}</span>
                      </td>
                      <td className="adm-end">
                        <div className="adm-actions">
                          {usageCount > 0 ? (
                            <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet" onClick={() => setHistory(card)}>
                              Geçmiş ({usageCount})<span className="visually-hidden"> {card.code}</span>
                            </button>
                          ) : null}
                          <button type="button" className="adm-btn adm-btn--sm" onClick={() => toggle(card)}>
                            {card.isActive ? 'Dondur' : 'Aç'}
                            <span className="visually-hidden"> {card.code}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={Boolean(history)} onClose={() => setHistory(null)} title={history?.code ?? ''} eyebrow="Kullanım geçmişi" className="adm-dialog" size="lg">
        {history ? (
          <div className="adm-form">
            <dl className="adm-dl">
              <div>
                <dt>Başlangıç</dt>
                <dd>{money(history.initialBalance)}</dd>
              </div>
              <div>
                <dt>Kalan</dt>
                <dd>{money(history.currentBalance)}</dd>
              </div>
              <div>
                <dt>Harcanan</dt>
                <dd>{money(history.initialBalance - history.currentBalance)}</dd>
              </div>
            </dl>
            <div className="adm-table-scroll adm-table-scroll--flat">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Sipariş</th>
                    <th scope="col">Tarih</th>
                    <th scope="col" className="adm-num">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {history.usages?.map((usage) => (
                    <tr key={usage.id}>
                      <td className="adm-cell__main">{usage.order ? `#${usage.order.orderNumber}` : '—'}</td>
                      <td className="adm-cell__sub">
                        {new Date(usage.usedAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="adm-num">−{money(usage.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Dialog>

      <CreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(card, emailSent) => {
          setCreating(false);
          setCards((current) => [{ ...card, usages: [] }, ...(current ?? [])]);
          if (emailSent) success(`${card.code} tanımlandı ve ${card.recipientEmail} adresine gönderildi.`);
          else error(`${card.code} tanımlandı ancak e-posta gönderilemedi. Kodu alıcıya kendiniz iletin.`);
        }}
      />
      {dialog}
    </div>
  );
}

type Draft = { initialBalance: string; theme: string; recipientName: string; recipientEmail: string; senderName: string; giftNote: string };
const EMPTY: Draft = { initialBalance: '1000', theme: 'noir', recipientName: '', recipientEmail: '', senderName: 'Pandiones', giftNote: '' };

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose(): void; onCreated(card: GiftCard, emailSent: boolean): void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(EMPTY);
      setErrors({});
      setFormError(null);
      setPending(false);
    }
  }, [open]);

  const set = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof Draft, string>> = {};
    const balance = Number(draft.initialBalance);
    if (!Number.isFinite(balance) || balance <= 0) next.initialBalance = 'Sıfırdan büyük bir tutar girin.';
    if (!draft.recipientName.trim()) next.recipientName = 'Alıcının adını girin.';
    if (!EMAIL.test(draft.recipientEmail.trim())) next.recipientEmail = 'Geçerli bir e-posta adresi girin.';
    return next;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const next = validate();
    setErrors(next);
    const first = (Object.keys(next) as (keyof Draft)[])[0];
    if (first) {
      event.currentTarget.querySelector<HTMLElement>(`#gift-${first}`)?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const data = await sendJson<{ giftCard: GiftCard; emailSent?: boolean }>('/api/admin/gift-cards', 'POST', draft, 'Hediye kartı tanımlanamadı.');
      onCreated(data.giftCard, Boolean(data.emailSent));
    } catch (err) {
      setFormError(errorText(err, 'Hediye kartı tanımlanamadı.'));
      setPending(false);
    }
  };

  const field = (key: keyof Draft) => ({
    id: `gift-${key}`,
    value: draft[key],
    'aria-invalid': Boolean(errors[key]) || undefined,
    'aria-describedby': errors[key] ? `gift-${key}-error` : undefined,
  });
  const fieldError = (key: keyof Draft) =>
    errors[key] ? (
      <p id={`gift-${key}-error`} className="adm-field-error">
        {errors[key]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} title="Hediye kartı tanımla" className="adm-dialog">
      <form className="adm-form" onSubmit={submit} noValidate>
        <p className="adm-dialog__lead">Kart oluşturulunca kod alıcıya e-postayla gönderilir. Gönderim başarısız olursa size bildirilir.</p>
        <div className="adm-form__grid">
          <div className="adm-field">
            <label htmlFor="gift-initialBalance">Bakiye (₺)</label>
            <input {...field('initialBalance')} type="number" inputMode="decimal" min={1} step={50} required onChange={(e) => set('initialBalance', e.target.value)} />
            {fieldError('initialBalance')}
          </div>
          <div className="adm-field">
            <label htmlFor="gift-theme">Tema</label>
            <select id="gift-theme" value={draft.theme} onChange={(e) => set('theme', e.target.value)}>
              {THEMES.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="gift-recipientName">Alıcı adı</label>
            <input {...field('recipientName')} autoComplete="off" required onChange={(e) => set('recipientName', e.target.value)} />
            {fieldError('recipientName')}
          </div>
          <div className="adm-field">
            <label htmlFor="gift-recipientEmail">Alıcı e-postası</label>
            <input {...field('recipientEmail')} type="email" autoComplete="off" required onChange={(e) => set('recipientEmail', e.target.value)} />
            {fieldError('recipientEmail')}
          </div>
        </div>
        <div className="adm-field">
          <label htmlFor="gift-senderName">Gönderen adı</label>
          <input {...field('senderName')} autoComplete="off" onChange={(e) => set('senderName', e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="gift-giftNote">Not (isteğe bağlı)</label>
          <textarea {...field('giftNote')} rows={3} maxLength={300} onChange={(e) => set('giftNote', e.target.value)} />
        </div>
        {formError ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="adm-dialog__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={pending}>
            Vazgeç
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={pending} aria-busy={pending}>
            {pending ? 'Oluşturuluyor' : 'Oluştur ve gönder'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
