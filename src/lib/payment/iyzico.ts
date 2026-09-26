import crypto from 'crypto';

export interface BuyerInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  identityNumber?: string;
  address: string;
  city: string;
  district: string;
}

export interface BasketItem {
  id: string;
  name: string;
  category1: string;
  price: number;
}

export interface InitCheckoutParams {
  locale?: 'tr' | 'en';
  conversationId: string;
  price: number;
  paidPrice: number;
  currency?: 'TRY';
  basketId: string;
  paymentGroup?: 'PRODUCT';
  callbackUrl: string;
  buyer: BuyerInfo;
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
  basketItems: BasketItem[];
}

export interface CheckoutFormResult {
  status: 'success' | 'failure';
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  errorMessage?: string;
  isMock: boolean;
}

export interface RetrievePaymentResult {
  status: 'success' | 'failure';
  paymentStatus: 'SUCCESS' | 'FAILURE';
  paymentId?: string;
  price?: number;
  paidPrice?: number;
  installment?: number;
  currency?: string;
  basketId?: string;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  binNumber?: string;
  lastFourDigits?: string;
  errorMessage?: string;
  rawResponse?: string;
}

const IYZICO_API_KEY = process.env.IYZICO_API_KEY || '';
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || '';
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

export function isIyzicoConfigured(): boolean {
  return Boolean(
    IYZICO_API_KEY &&
    IYZICO_SECRET_KEY &&
    !IYZICO_API_KEY.includes('your_')
  );
}

/**
 * iyzico V1 API Header Generator (IYZWS)
 */
function generateIyzwsHeader(
  apiKey: string,
  secretKey: string,
  randomString: string,
  pkiString: string
): string {
  const dataToHash = apiKey + randomString + secretKey + pkiString;
  const hash = crypto.createHash('sha1').update(dataToHash, 'utf8').digest('base64');
  return `IYZWS ${apiKey}:${hash}`;
}

/**
 * Helper to generate iyzico PKI String format
 */
function generatePkiString(request: any): string {
  let pki = '[';
  for (const [key, value] of Object.entries(request)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      pki += `${key}=[`;
      for (const item of value) {
        if (typeof item === 'object') {
          pki += generatePkiString(item);
          pki += ', ';
        } else {
          pki += `${item}, `;
        }
      }
      if (value.length > 0) pki = pki.slice(0, -2);
      pki += '],';
    } else if (typeof value === 'object') {
      pki += `${key}=${generatePkiString(value)},`;
    } else {
      pki += `${key}=${value},`;
    }
  }
  if (pki.length > 1 && pki.endsWith(',')) {
    pki = pki.slice(0, -1);
  }
  pki += ']';
  return pki;
}

/**
 * Initialize iyzico Checkout Form (3D Secure)
 */
export async function initializeIyzicoCheckout(
  params: InitCheckoutParams
): Promise<CheckoutFormResult> {
  if (!isIyzicoConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return {
        status: 'failure',
        errorMessage: 'Ödeme altyapısı yapılandırılmamıştır. Canlı ortamda işlem yapılamaz.',
        isMock: false,
      };
    }

    // Elegant Mock Simulator mode for development / preview
    const mockToken = `MOCK_IYZICO_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const scriptContent = `
      <div id="pandiones-iyzico-simulator" style="background:#fff; border:1px solid #dedfda; padding:28px; border-radius:4px; max-width:480px; margin:0 auto; box-shadow:0 12px 36px rgba(0,0,0,0.06); font-family:var(--font-sans, sans-serif);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dedfda; padding-bottom:14px; margin-bottom:20px;">
          <span style="font-weight:600; font-size:14px; letter-spacing:0.06em; color:#202120;">GÜVENLİ ÖDEME (3D SECURE)</span>
          <span style="font-size:11px; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; padding:2px 8px; border-radius:3px;">SİMÜLASYON AKTİF</span>
        </div>
        <p style="font-size:13px; color:#626560; margin:0 0 16px; line-height:1.5;">
          Toplam Tutar: <strong style="color:#202120; font-size:16px;">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(params.paidPrice)}</strong>
        </p>
        <div style="background:#f8f8f6; border:1px solid #dedfda; padding:12px; margin-bottom:20px; font-size:12px; color:#202120; border-radius:3px;">
          💳 <strong>Mastercard Gold (Son 4: 1024)</strong><br />
          Taksit: <strong>Tek Çekim (Peşin)</strong><br />
          3D Secure SMS Kodu: <strong>Otomatik Doğrulandı</strong>
        </div>
        <form method="POST" action="${params.callbackUrl}">
          <input type="hidden" name="token" value="${mockToken}" />
          <input type="hidden" name="conversationId" value="${params.conversationId}" />
          <button type="submit" style="width:100%; background:#202120; color:#f8f8f6; padding:14px; font-size:13px; letter-spacing:0.08em; border:none; cursor:pointer; font-weight:500; transition:opacity 0.2s;">
            3D SECURE SMS DOĞRULA VE ÖDE ↗
          </button>
        </form>
      </div>
    `;

    return {
      status: 'success',
      token: mockToken,
      checkoutFormContent: scriptContent,
      isMock: true,
    };
  }

  // Live or Sandbox API Call
  try {
    const randomString = Date.now().toString();
    const requestBody = {
      locale: params.locale || 'tr',
      conversationId: params.conversationId,
      price: params.price.toFixed(2),
      paidPrice: params.paidPrice.toFixed(2),
      currency: params.currency || 'TRY',
      basketId: params.basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1, 2, 3, 6],
      buyer: {
        id: params.buyer.id,
        name: params.buyer.name,
        surname: params.buyer.surname,
        gsmNumber: params.buyer.phone,
        email: params.buyer.email,
        identityNumber: params.buyer.identityNumber || '11111111110',
        registrationAddress: params.buyer.address,
        ip: '85.105.10.10',
        city: params.buyer.city,
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: params.shippingAddress.contactName,
        city: params.shippingAddress.city,
        country: 'Turkey',
        address: params.shippingAddress.address,
        zipCode: params.shippingAddress.zipCode || '34000',
      },
      billingAddress: {
        contactName: params.billingAddress.contactName,
        city: params.billingAddress.city,
        country: 'Turkey',
        address: params.billingAddress.address,
        zipCode: params.billingAddress.zipCode || '34000',
      },
      basketItems: params.basketItems.map((item) => ({
        id: item.id,
        name: item.name,
        category1: item.category1 || 'Giyim',
        itemType: 'PHYSICAL',
        price: item.price.toFixed(2),
      })),
    };

    const pkiString = generatePkiString(requestBody);
    const authHeader = generateIyzwsHeader(
      IYZICO_API_KEY,
      IYZICO_SECRET_KEY,
      randomString,
      pkiString
    );

    const response = await fetch(
      `${IYZICO_BASE_URL}/payment/iyzipay/checkoutform/initialize/auth/ecom`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'x-iyzi-rnd': randomString,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (data.status === 'success') {
      return {
        status: 'success',
        token: data.token,
        checkoutFormContent: data.checkoutFormContent,
        paymentPageUrl: data.paymentPageUrl,
        isMock: false,
      };
    } else {
      return {
        status: 'failure',
        errorMessage: data.errorMessage || 'iyzico ödeme formu başlatılamadı.',
        isMock: false,
      };
    }
  } catch (error: any) {
    console.error('iyzico initialization network error:', error);
    return {
      status: 'failure',
      errorMessage: error.message || 'Ödeme sağlayıcısına bağlanırken hata oluştu.',
      isMock: false,
    };
  }
}

/**
 * Retrieve & Verify iyzico Checkout Form Result after 3DS Callback
 */
export async function retrieveIyzicoPayment(
  token: string,
  conversationId?: string
): Promise<RetrievePaymentResult> {
  // Handle Mock simulator token
  if (token.startsWith('MOCK_IYZICO_')) {
    if (process.env.NODE_ENV === 'production') {
      return {
        status: 'failure',
        paymentStatus: 'FAILURE',
        errorMessage: 'Üretim ortamında simülatör ödemeleri kabul edilmez.',
      };
    }
    return {
      status: 'success',
      paymentStatus: 'SUCCESS',
      paymentId: `MOCK_PAY_${Date.now()}`,
      installment: 1,
      currency: 'TRY',
      cardType: 'CREDIT_CARD',
      cardAssociation: 'MASTER_CARD',
      cardFamily: 'Bonus',
      binNumber: '540061',
      lastFourDigits: '1024',
      rawResponse: JSON.stringify({ mock: true, token, timestamp: new Date().toISOString() }),
    };
  }

  try {
    const randomString = Date.now().toString();
    const requestBody = {
      locale: 'tr',
      conversationId: conversationId || `ret_${Date.now()}`,
      token,
    };

    const pkiString = generatePkiString(requestBody);
    const authHeader = generateIyzwsHeader(
      IYZICO_API_KEY,
      IYZICO_SECRET_KEY,
      randomString,
      pkiString
    );

    const response = await fetch(
      `${IYZICO_BASE_URL}/payment/iyzipay/checkoutform/auth/ecom/detail`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'x-iyzi-rnd': randomString,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (data.status === 'success' && data.paymentStatus === 'SUCCESS') {
      return {
        status: 'success',
        paymentStatus: 'SUCCESS',
        paymentId: data.paymentId,
        price: data.price ? parseFloat(data.price) : undefined,
        paidPrice: data.paidPrice ? parseFloat(data.paidPrice) : undefined,
        installment: data.installment ? parseInt(data.installment) : 1,
        currency: data.currency || 'TRY',
        basketId: data.basketId,
        cardType: data.cardType,
        cardAssociation: data.cardAssociation,
        cardFamily: data.cardFamily,
        binNumber: data.binNumber,
        lastFourDigits: data.lastFourDigits,
        rawResponse: JSON.stringify(data),
      };
    } else {
      return {
        status: 'failure',
        paymentStatus: 'FAILURE',
        errorMessage: data.errorMessage || 'Ödeme banka tarafından onaylanmadı.',
        rawResponse: JSON.stringify(data),
      };
    }
  } catch (error: any) {
    console.error('iyzico retrieve error:', error);
    return {
      status: 'failure',
      paymentStatus: 'FAILURE',
      errorMessage: error.message || 'Ödeme sonucu doğrulanırken bağlantı hatası oluştu.',
    };
  }
}
