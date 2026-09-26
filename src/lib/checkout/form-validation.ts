/** Client-side checks for the checkout form. The server remains the authority. */

export type CheckoutFormData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingAddress: string;
  shippingNotes: string;
};

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutFormData, string>>;

export const CHECKOUT_FIELD_ORDER: (keyof CheckoutFormData)[] = [
  'customerName', 'customerEmail', 'customerPhone',
  'shippingCity', 'shippingDistrict', 'shippingAddress', 'shippingNotes',
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_ADDRESS_LENGTH = 10;

/** 5XXXXXXXXX with an optional 0 / 90 / +90 prefix; spaces, dashes and brackets ignored. */
export function isValidTurkishMobile(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('90') && digits.length === 12
    ? digits.slice(2)
    : digits.startsWith('0') && digits.length === 11
      ? digits.slice(1)
      : digits;
  return national.length === 10 && national.startsWith('5');
}

export function validateCheckoutForm(data: CheckoutFormData): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const name = data.customerName.trim();
  const email = data.customerEmail.trim();
  const phone = data.customerPhone.trim();

  if (!name) errors.customerName = 'Ad ve soyadınızı girin.';

  if (!email) errors.customerEmail = 'E-posta adresinizi girin.';
  else if (!EMAIL.test(email)) errors.customerEmail = 'Geçerli bir e-posta adresi girin.';

  if (!phone || !isValidTurkishMobile(phone)) {
    errors.customerPhone = 'Cep telefonunuzu 05XX XXX XX XX biçiminde girin.';
  }

  if (!data.shippingCity.trim()) errors.shippingCity = 'Şehir girin.';
  if (!data.shippingDistrict.trim()) errors.shippingDistrict = 'İlçe girin.';

  if (data.shippingAddress.trim().length < MIN_ADDRESS_LENGTH) {
    errors.shippingAddress = 'Mahalle, cadde/sokak ve kapı numarasıyla açık adres girin.';
  }

  return errors;
}
