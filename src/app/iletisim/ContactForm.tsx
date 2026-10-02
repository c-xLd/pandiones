'use client';

import React, { useEffect, useRef, useState } from 'react';
import FormField from '@/components/ui/FormField';
import Turnstile, { turnstileEnabled } from '@/components/security/Turnstile';
import {
  CONTACT_LIMITS,
  CONTACT_SUBJECTS,
  normalizeContact,
  validateContact,
  type ContactField,
  type ContactFieldErrors,
  type ContactInput,
} from '@/lib/contact/validate';

const EMPTY: ContactInput = { name: '', email: '', phone: '', orderNumber: '', subject: '', message: '' };
const FIELD_ORDER: ContactField[] = ['name', 'email', 'phone', 'orderNumber', 'subject', 'message'];

export default function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanReset, setHumanReset] = useState(0);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (sentTo) successRef.current?.focus();
  }, [sentTo]);

  const set = (field: ContactField, transform: (value: string) => string = (value) => value) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const value = transform(event.target.value);
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const focusFirstError = (fieldErrors: ContactFieldErrors) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#contact-${first}`)?.focus();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const input = normalizeContact({ ...values });
    const fieldErrors = validateContact(input);
    setErrors(fieldErrors);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0) return focusFirstError(fieldErrors);

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, website, turnstileToken: humanToken }),
      });
      setHumanReset((v) => v + 1);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (data.fieldErrors) {
          setErrors(data.fieldErrors);
          focusFirstError(data.fieldErrors);
        }
        setFormError(data.error || 'Mesajınız gönderilemedi. Lütfen tekrar deneyin.');
        return;
      }
      setSentTo(input.email);
      setValues(EMPTY);
    } catch {
      setFormError(`Bağlantı kurulamadı. Tekrar deneyin ya da ${supportEmail} adresine yazın.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="contact-success" role="status">
        <span className="contact-success__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <h2 ref={successRef} tabIndex={-1} className="contact-success__title">Mesajınız ekibimize ulaştı</h2>
        <p>Yanıtımız <strong>{sentTo}</strong> adresine gelecek.</p>
        <button type="button" className="btn btn--secondary" onClick={() => setSentTo(null)}>
          Yeni mesaj yaz
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="contact-form" noValidate onSubmit={submit} aria-busy={submitting} aria-labelledby="contact-form-title">
      <h2 id="contact-form-title" className="contact-form__title">Mesaj gönder</h2>

      <div className="form-row">
        <FormField id="contact-name" label="Ad soyad" required error={errors.name}>
          <input type="text" autoComplete="name" maxLength={CONTACT_LIMITS.name} value={values.name} onChange={set('name')} />
        </FormField>
        <FormField id="contact-email" label="E-posta" required error={errors.email}>
          <input type="email" autoComplete="email" inputMode="email" maxLength={CONTACT_LIMITS.email} value={values.email} onChange={set('email')} />
        </FormField>
      </div>

      <div className="form-row">
        <FormField id="contact-phone" label="Telefon" optional error={errors.phone}>
          <input type="tel" autoComplete="tel" inputMode="tel" placeholder="05XX XXX XX XX" maxLength={CONTACT_LIMITS.phone} value={values.phone} onChange={set('phone')} />
        </FormField>
        <FormField id="contact-orderNumber" label="Sipariş numarası" optional error={errors.orderNumber}>
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="PAN-000000"
            maxLength={CONTACT_LIMITS.orderNumber}
            value={values.orderNumber}
            onChange={set('orderNumber', (value) => value.toUpperCase())}
          />
        </FormField>
      </div>

      <FormField id="contact-subject" label="Konu" required error={errors.subject}>
        <select value={values.subject} onChange={set('subject')}>
          <option value="" disabled>Bir konu seçin</option>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </FormField>

      <FormField
        id="contact-message"
        label="Mesajınız"
        required
        hint={`${values.message.trim().length} / ${CONTACT_LIMITS.message}`}
        error={errors.message}
      >
        <textarea rows={6} maxLength={CONTACT_LIMITS.message} value={values.message} onChange={set('message')} />
      </FormField>

      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div className="contact-form__trap" aria-hidden="true">
        <label htmlFor="contact-website">Web sitesi</label>
        <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>

      {formError ? (
        <p className="form-alert form-alert--error" role="alert">{formError}</p>
      ) : null}

      <div className="contact-form__foot">
        <p className="contact-form__privacy">Bilgileriniz yalnız bu mesajı yanıtlamak için kullanılır.</p>
        <Turnstile action="contact" onToken={setHumanToken} resetKey={humanReset} />
        <button type="submit" className="btn btn--primary btn--lg" disabled={submitting || (turnstileEnabled && !humanToken)} aria-busy={submitting}>
          {submitting ? 'Gönderiliyor…' : 'Mesajı gönder'}
        </button>
      </div>
    </form>
  );
}
