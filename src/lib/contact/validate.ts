/** Contact form rules, shared by /iletisim and POST /api/contact. Unit-tested in tests/contact.test.ts. */

export const CONTACT_SUBJECTS = [
  'Sipariş ve teslimat',
  'İade ve değişim',
  'Beden danışmanlığı',
  'Hediye kartı',
  'İş birliği',
  'Diğer',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const CONTACT_LIMITS = { name: 100, email: 254, phone: 20, orderNumber: 20, message: 2000, messageMin: 10 } as const;

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  orderNumber: string;
  subject: string;
  message: string;
};

export type ContactField = keyof ContactInput;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]{10,20}$/;
const ORDER_PATTERN = /^PAN-[0-9]{6}$/;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function normalizeContact(raw: Record<string, unknown>): ContactInput {
  return {
    name: text(raw.name).replace(/\s+/g, ' '),
    email: text(raw.email).toLowerCase(),
    phone: text(raw.phone),
    orderNumber: text(raw.orderNumber).toUpperCase(),
    subject: text(raw.subject),
    message: text(raw.message),
  };
}

export function validateContact(input: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  if (input.name.length < 2) errors.name = 'Adınızı ve soyadınızı yazın.';
  else if (input.name.length > CONTACT_LIMITS.name) errors.name = `En fazla ${CONTACT_LIMITS.name} karakter.`;

  if (!input.email) errors.email = 'E-posta adresinizi yazın.';
  else if (input.email.length > CONTACT_LIMITS.email || !EMAIL_PATTERN.test(input.email)) errors.email = 'Geçerli bir e-posta adresi yazın.';

  if (input.phone && !PHONE_PATTERN.test(input.phone)) errors.phone = 'Telefon numarasını 05XX XXX XX XX biçiminde yazın.';

  if (input.orderNumber && !ORDER_PATTERN.test(input.orderNumber)) errors.orderNumber = 'Sipariş numarası PAN-123456 biçimindedir.';

  if (!(CONTACT_SUBJECTS as readonly string[]).includes(input.subject)) errors.subject = 'Bir konu seçin.';

  if (input.message.length < CONTACT_LIMITS.messageMin) errors.message = `Mesajınız en az ${CONTACT_LIMITS.messageMin} karakter olmalı.`;
  else if (input.message.length > CONTACT_LIMITS.message) errors.message = `Mesajınız en fazla ${CONTACT_LIMITS.message} karakter olabilir.`;

  return errors;
}
