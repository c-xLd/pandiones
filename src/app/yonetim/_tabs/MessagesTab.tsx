'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { errorText, loadJson, sendJson } from '../_lib/request';
import { TabLoadError, TabLoading } from '../_components/TabState';
import { useTabNotice } from '../_components/TabNotice';
import { useConfirm } from '../_components/ConfirmDialog';
import AdminIcon from '../_components/AdminIcon';

type MessageStatus = 'YENI' | 'YANITLANDI';
type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  orderNumber?: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
};

const dateTime = (value: string, month: 'short' | 'long' = 'short') =>
  new Date(value).toLocaleString('tr-TR', { day: 'numeric', month, ...(month === 'long' ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' });
const includes = (value: string | null | undefined, needle: string) => Boolean(value && value.toLocaleLowerCase('tr-TR').includes(needle));

const replyHref = (m: ContactMessage) =>
  `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject} [Pandiones Destek]`)}&body=${encodeURIComponent(
    `Merhaba ${m.name},\n\nİletmiş olduğunuz talep incelenmiştir:\n\nSaygılarımızla,\nPandiones Müşteri Hizmetleri`,
  )}`;

export default function MessagesTab({ onNavigateOrder }: { onNavigateOrder?: (orderNumber: string) => void }) {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'' | MessageStatus>('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { notice, success } = useTabNotice();
  const { ask, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setMessages(await loadJson<ContactMessage[]>('/api/admin/contact-messages', 'Mesajlar yüklenemedi.', Array.isArray));
    } catch (err) {
      setLoadError(errorText(err, 'Mesajlar yüklenemedi.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = (message: ContactMessage) =>
    ask({
      title: 'Mesaj silinsin mi?',
      message: (
        <p>
          {message.name} adlı kişinin “{message.subject}” mesajı kalıcı olarak silinir.
        </p>
      ),
      confirmLabel: 'Mesajı sil',
      pendingLabel: 'Siliniyor',
      danger: true,
      onConfirm: async () => {
        await sendJson('/api/admin/contact-messages', 'DELETE', { id: message.id }, 'Mesaj silinemedi.');
        setMessages((current) => current?.filter((item) => item.id !== message.id) ?? null);
        setOpenId((current) => (current === message.id ? null : current));
        success('Mesaj silindi.');
      },
    });

  if (loadError) return <TabLoadError message={loadError} onRetry={() => { setMessages(null); void load(); }} />;
  if (!messages) return <TabLoading label="Mesajlar yükleniyor" />;

  const pendingCount = messages.filter((m) => m.status === 'YENI').length;
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  const visible = messages.filter(
    (m) =>
      (!filter || m.status === filter) &&
      (!needle || includes(m.name, needle) || includes(m.email, needle) || includes(m.subject, needle) || includes(m.orderNumber, needle)),
  );
  const open = messages.find((m) => m.id === openId) ?? null;

  return (
    <div className="adm-tab">
      {messages.length > 0 ? (
        <div className="adm-toolbar">
          <div className="adm-segmented" role="group" aria-label="Mesaj durumu">
            <button type="button" aria-pressed={filter === ''} onClick={() => setFilter('')}>
              Tümü ({messages.length})
            </button>
            <button type="button" aria-pressed={filter === 'YENI'} onClick={() => setFilter('YENI')}>
              Yanıt bekleyen ({pendingCount})
            </button>
            <button type="button" aria-pressed={filter === 'YANITLANDI'} onClick={() => setFilter('YANITLANDI')}>
              Yanıtlanan ({messages.length - pendingCount})
            </button>
          </div>
          <label className="adm-search adm-toolbar__grow">
            <span className="visually-hidden">Ad, e-posta, konu veya sipariş no ara</span>
            <AdminIcon name="search" />
            <input type="search" placeholder="Ad, e-posta, konu, sipariş no" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
      ) : null}

      {notice}

      {messages.length === 0 ? (
        <p className="adm-empty">Henüz mesaj yok. İletişim formundan gönderilen mesajlar burada listelenir.</p>
      ) : visible.length === 0 ? (
        <p className="adm-empty">Bu filtrede mesaj yok.</p>
      ) : (
        <div className="adm-table-wrap">
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Tarih</th>
                  <th scope="col">Gönderen</th>
                  <th scope="col">Konu ve mesaj</th>
                  <th scope="col">Sipariş</th>
                  <th scope="col">Durum</th>
                  <th scope="col" className="adm-end">
                    <span className="visually-hidden">İşlem</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((message) => (
                  <tr key={message.id} data-unread={message.status === 'YENI' || undefined}>
                    <td className="adm-cell__sub">{dateTime(message.createdAt)}</td>
                    <td>
                      <div className="adm-cell">
                        <span className="adm-cell__main">{message.name}</span>
                        <span className="adm-cell__sub">{message.email}</span>
                        {message.phone ? <span className="adm-cell__sub">{message.phone}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="adm-cell adm-cell--clamp">
                        <span className="adm-cell__strong">{message.subject}</span>
                        <span className="adm-cell__main">{message.message}</span>
                      </div>
                    </td>
                    <td>
                      {message.orderNumber ? (
                        onNavigateOrder ? (
                          <button type="button" className="adm-link" onClick={() => onNavigateOrder(message.orderNumber!)}>
                            #{message.orderNumber}
                          </button>
                        ) : (
                          `#${message.orderNumber}`
                        )
                      ) : (
                        <span className="adm-cell__sub">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`adm-status adm-status--${message.status === 'YENI' ? 'warning' : 'success'}`}>
                        {message.status === 'YENI' ? 'Yanıt bekliyor' : 'Yanıtlandı'}
                      </span>
                    </td>
                    <td className="adm-end">
                      <div className="adm-actions">
                        <button type="button" className="adm-btn adm-btn--sm" onClick={() => setOpenId(message.id)}>
                          Oku<span className="visually-hidden"> {message.subject}</span>
                        </button>
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--quiet adm-btn--danger-text" onClick={() => remove(message)}>
                          <AdminIcon name="trash" />
                          <span className="visually-hidden">Sil: {message.subject}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open ? (
        <MessageDialog
          message={open}
          onClose={() => setOpenId(null)}
          onStatus={(status) => {
            setMessages((current) => current?.map((item) => (item.id === open.id ? { ...item, status } : item)) ?? null);
            success(status === 'YANITLANDI' ? 'Mesaj yanıtlandı olarak işaretlendi.' : 'Mesaj yeniden yanıt bekleyenlere alındı.');
          }}
        />
      ) : null}
      {dialog}
    </div>
  );
}

function MessageDialog({ message, onClose, onStatus }: { message: ContactMessage; onClose(): void; onStatus(status: MessageStatus): void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next: MessageStatus = message.status === 'YENI' ? 'YANITLANDI' : 'YENI';

  const changeStatus = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await sendJson('/api/admin/contact-messages', 'PATCH', { id: message.id, status: next }, 'Durum güncellenemedi.');
      onStatus(next);
    } catch (err) {
      setError(errorText(err, 'Durum güncellenemedi.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={message.subject} eyebrow="Destek mesajı" className="adm-dialog" size="lg">
      <div className="adm-form">
        <dl className="adm-dl">
          <div>
            <dt>Gönderen</dt>
            <dd>{message.name}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>{message.email}</dd>
          </div>
          {message.phone ? (
            <div>
              <dt>Telefon</dt>
              <dd>{message.phone}</dd>
            </div>
          ) : null}
          <div>
            <dt>Tarih</dt>
            <dd>{dateTime(message.createdAt, 'long')}</dd>
          </div>
          {message.orderNumber ? (
            <div>
              <dt>Sipariş</dt>
              <dd>#{message.orderNumber}</dd>
            </div>
          ) : null}
        </dl>
        <section className="adm-dialog__section" aria-labelledby="message-body">
          <h3 id="message-body" className="adm-dialog__heading">
            Mesaj
          </h3>
          <p className="adm-message-body">{message.message}</p>
        </section>
        {error ? (
          <p className="adm-field-error adm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="adm-dialog__actions adm-dialog__actions--split">
          <button type="button" className="adm-btn" onClick={changeStatus} disabled={pending} aria-busy={pending}>
            {pending ? 'Kaydediliyor' : next === 'YANITLANDI' ? 'Yanıtlandı olarak işaretle' : 'Yeniden yanıt bekliyor yap'}
          </button>
          <a href={replyHref(message)} className="adm-btn adm-btn--primary">
            E-postayla yanıtla
          </a>
        </div>
      </div>
    </Dialog>
  );
}
