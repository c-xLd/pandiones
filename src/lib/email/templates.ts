import type {
  OrderConfirmationEmailData,
  OrderShippedEmailData,
  StockAlertEmailData,
  NewsletterWelcomeEmailData,
  GiftCardDeliveryEmailData,
} from './types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pandiones.com';

function baseEmailHtml(title: string, bodyContent: string, footerExtra: string = ''): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f7f6f2;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f6f2;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e8e6df;
      padding: 48px 40px;
    }
    .brand {
      font-family: Georgia, serif;
      font-size: 22px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 32px;
      color: #111111;
      text-decoration: none;
      display: block;
    }
    .divider {
      height: 1px;
      background-color: #eeece6;
      margin: 24px 0;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 24px;
      font-weight: 400;
      color: #111111;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #444444;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .item-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #888888;
      border-bottom: 1px solid #eeece6;
      padding-bottom: 8px;
    }
    .item-table td {
      padding: 12px 0;
      font-size: 13px;
      border-bottom: 1px solid #f2f0eb;
      vertical-align: middle;
    }
    .total-row td {
      border-bottom: none;
      padding-top: 16px;
      font-weight: 600;
      font-size: 14px;
      color: #111111;
    }
    .btn {
      display: inline-block;
      background-color: #111111;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 14px 28px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #888888;
      margin-top: 32px;
      line-height: 1.5;
    }
    .footer a {
      color: #666666;
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 32px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <a href="${SITE_URL}" class="brand">PANDIONES</a>
      ${bodyContent}
      <div class="divider"></div>
      <div class="footer">
        <p>Pandiones — Doğal ipek, saf zanaat ve zamansız estetik.</p>
        <p>Sorularınız için <a href="mailto:destek@pandiones.com">destek@pandiones.com</a> adresinden bize ulaşabilirsiniz.</p>
        ${footerExtra}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generateOrderConfirmationEmail(data: OrderConfirmationEmailData): { subject: string; html: string; text: string } {
  const subject = `Siparişiniz Onaylandı — #${data.orderNumber}`;

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${item.productName}</strong><br>
          <span style="color: #777777; font-size: 12px;">Beden: ${item.size}</span>
        </td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₺${item.price.toLocaleString('tr-TR')}</td>
      </tr>`
    )
    .join('');

  const bodyContent = `
    <h1>Siparişiniz Alındı</h1>
    <p>Sayın ${data.customerName},</p>
    <p><strong>#${data.orderNumber}</strong> numaralı siparişiniz başarıyla onaylandı ve özenle hazırlanmaya başlandı.</p>
    
    <div class="divider"></div>
    
    <table class="item-table">
      <thead>
        <tr>
          <th>Ürün</th>
          <th style="text-align: center;">Adet</th>
          <th style="text-align: right;">Fiyat</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        ${
          data.discountAmount && data.discountAmount > 0
            ? `<tr>
                <td colspan="2" style="color: #666;">Kupon İndirimi ${data.couponCode ? `(${data.couponCode})` : ''}</td>
                <td style="text-align: right; color: #166534;">-₺${data.discountAmount.toLocaleString('tr-TR')}</td>
              </tr>`
            : ''
        }
        <tr class="total-row">
          <td colspan="2">Toplam Tutar</td>
          <td style="text-align: right;">₺${data.totalAmount.toLocaleString('tr-TR')}</td>
        </tr>
      </tbody>
    </table>

    <div class="divider"></div>

    <p style="font-size: 13px;"><strong>Teslimat Adresi:</strong><br>
      ${data.shippingAddress}<br>
      ${data.shippingDistrict} / ${data.shippingCity}
    </p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${SITE_URL}/siparis-onay/${data.orderNumber}" class="btn">Siparişi Görüntüle</a>
    </div>
  `;

  const textItems = data.items
    .map((item) => `- ${item.productName} (Beden: ${item.size}, Adet: ${item.quantity}) - ₺${item.price}`)
    .join('\n');

  const text = `PANDIONES
Siparişiniz Alındı — #${data.orderNumber}

Sayın ${data.customerName},
#${data.orderNumber} numaralı siparişiniz başarıyla onaylandı.

Sipariş Detayı:
${textItems}
Toplam Tutar: ₺${data.totalAmount}

Teslimat Adresi:
${data.shippingAddress}
${data.shippingDistrict} / ${data.shippingCity}

Siparişinizi incelemek için:
${SITE_URL}/siparis-onay/${data.orderNumber}

Pandiones — Doğal ipek, saf zanaat ve zamansız estetik.`;

  return {
    subject,
    html: baseEmailHtml(subject, bodyContent),
    text,
  };
}

export function generateOrderShippedEmail(data: OrderShippedEmailData): { subject: string; html: string; text: string } {
  const subject = `Siparişiniz Yola Çıktı — #${data.orderNumber}`;

  const bodyContent = `
    <h1>Siparişiniz Kargoya Verildi</h1>
    <p>Sayın ${data.customerName},</p>
    <p><strong>#${data.orderNumber}</strong> numaralı siparişiniz özenle paketlenip yola çıkmıştır.</p>
    
    <div style="background-color: #fcfbf9; border: 1px solid #eeece6; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Kargo Firması:</strong> ${data.trackingCompany}</p>
      <p style="margin: 0; font-size: 13px;"><strong>Takip Numarası:</strong> <code style="font-size: 14px; letter-spacing: 0.05em;">${data.trackingCode}</code></p>
    </div>

    <p style="font-size: 13px; color: #555555;">
      Kargonuz dağıtıma çıktığında kargo şirketi tarafından SMS ile bilgilendirileceksiniz.
    </p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${SITE_URL}/siparis-onay/${data.orderNumber}" class="btn">Sipariş Durumu</a>
    </div>
  `;

  const text = `PANDIONES
Siparişiniz Kargoya Verildi — #${data.orderNumber}

Sayın ${data.customerName},
#${data.orderNumber} numaralı siparişiniz kargoya verilmiştir.

Kargo Firması: ${data.trackingCompany}
Takip Numarası: ${data.trackingCode}

Sipariş durumunu takip etmek için:
${SITE_URL}/siparis-onay/${data.orderNumber}

Pandiones`;

  return {
    subject,
    html: baseEmailHtml(subject, bodyContent),
    text,
  };
}

export function generateStockAlertEmail(data: StockAlertEmailData): { subject: string; html: string; text: string } {
  const subject = `Beklediğiniz Ürün Stokta — ${data.productName}`;
  const productUrl = `${SITE_URL}/urun/${data.productSlug}`;

  const bodyContent = `
    <h1>Bedeniniz Tekrar Stokta</h1>
    <p>Daha önce stok bildirim talebinde bulunduğunuz <strong>${data.productName}</strong> ürünümüzün <strong>${data.size} beden</strong> seçeneği yeniden satışa sunulmuştur.</p>
    
    <div style="background-color: #fcfbf9; border: 1px solid #eeece6; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="font-family: Georgia, serif; font-size: 18px; margin: 0 0 8px 0;">${data.productName}</p>
      <p style="font-size: 13px; color: #666; margin: 0 0 12px 0;">Beden: ${data.size}</p>
      <p style="font-size: 16px; font-weight: 600; margin: 0;">₺${data.price.toLocaleString('tr-TR')}</p>
    </div>

    <p style="font-size: 13px; color: #666666;">
      Koleksiyonlarımız sınırlı adetlerde üretilmektedir. Tükenmeden önce incelemek için aşağıdaki bağlantıyı kullanabilirsiniz.
    </p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${productUrl}" class="btn">Ürünü İncele</a>
    </div>
  `;

  const text = `PANDIONES
Beklediğiniz Ürün Stokta — ${data.productName}

${data.productName} (${data.size} beden) yeniden stoklarımıza girmiştir.
Fiyat: ₺${data.price}

Ürünü incelemek ve sipariş vermek için:
${productUrl}

Pandiones`;

  return {
    subject,
    html: baseEmailHtml(subject, bodyContent),
    text,
  };
}

export function generateNewsletterWelcomeEmail(data: NewsletterWelcomeEmailData): { subject: string; html: string; text: string } {
  const subject = 'Pandiones Dünyasına Hoş Geldiniz';

  const bodyContent = `
    <h1>Aramıza Hoş Geldiniz</h1>
    <p>Pandiones bültenine abone olduğunuz için teşekkür ederiz.</p>
    <p>Yeni koleksiyonlar, sınırlı ipek seçkileri ve özel davetler artık doğrudan posta kutunuzda olacak.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${SITE_URL}/koleksiyon" class="btn">Koleksiyonu Keşfet</a>
    </div>
  `;

  const footerExtra = `
    <p style="font-size: 11px; margin-top: 16px;">
      Bülten listemizden dilediğiniz an ayrılabilirsiniz: 
      <a href="${data.unsubscribeUrl}">Abonelikten Ayrıl</a>
    </p>
  `;

  const text = `PANDIONES
Pandiones Dünyasına Hoş Geldiniz

Pandiones bültenine abone olduğunuz için teşekkür ederiz.
Yeni koleksiyonlar ve sınırlı seçkilerden haberdar edileceksiniz.

Koleksiyonu keşfetmek için:
${SITE_URL}/koleksiyon

Abonelikten ayrılmak için:
${data.unsubscribeUrl}

Pandiones`;

  return {
    subject,
    html: baseEmailHtml(subject, bodyContent, footerExtra),
    text,
  };
}

export function generateGiftCardDeliveryEmail(data: GiftCardDeliveryEmailData): { subject: string; html: string; text: string } {
  const subject = `Size Özel Bir Pandiones Hediye Kartı Armağan Edildi`;
  const formattedExpiry = new Date(data.expiresAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isNoir = data.theme === 'noir';
  const isRose = data.theme === 'rose';
  const isCouture = data.theme === 'couture' || (!isNoir && !isRose);

  const cardBg = isNoir ? '#181716' : isRose ? '#f6eeec' : '#faf7f2';
  const cardText = isNoir ? '#f5f2eb' : isRose ? '#2b1f1d' : '#2a241e';
  const cardBorder = isNoir ? '#383431' : isRose ? '#dcc6c0' : 'rgba(212, 175, 55, 0.5)';
  const cardAccent = isNoir ? '#d4af37' : isRose ? '#b36d6d' : '#9a784e';

  const bodyContent = `
    <h1>Özel Hediye Kartınız Hazır</h1>
    <p>Sayın <strong>${data.recipientName}</strong>,</p>
    <p>${data.senderName ? `<strong>${data.senderName}</strong>` : 'Bir yakınınız'} sizin için özel bir Pandiones Dijital Hediye Kartı hazırladı.</p>

    <!-- Visual Digital Gift Certificate -->
    <div style="background-color: ${cardBg}; color: ${cardText}; border: 1.5px solid ${cardBorder}; border-radius: 14px; padding: 28px 24px; margin: 24px 0; box-shadow: 0 10px 35px rgba(0,0,0,0.06); text-align: left;">
      ${
        isCouture
          ? `<div style="text-align: center; margin-bottom: 16px; border-bottom: 1px solid rgba(212,175,55,0.25); padding-bottom: 14px;">
              <span style="font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: #9a784e; font-weight: 600; display: block;">
                PANDIONES
              </span>
              <span style="font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase; color: #7a6856; display: block; margin: 3px 0;">
                LINGERIE · LIVING FABRIC · MAISON
              </span>
              <span style="font-size: 12px; color: #d4af37;">— ꝏ —</span>
              <span style="font-size: 18px; font-family: Georgia, serif; letter-spacing: 0.08em; display: block; color: #3a2e20; margin-top: 4px;">
                HEDİYE ÇEKİ
              </span>
              <span style="font-size: 8px; letter-spacing: 0.25em; text-transform: uppercase; color: #9a784e;">
                SİZİN İÇİN ÖZEL
              </span>
            </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <span style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.65; display: block; font-family: monospace;">
            CARTE CADEAU D'ATELIER
          </span>
          <span style="font-size: 18px; font-family: Georgia, serif; letter-spacing: 0.05em; font-weight: 400;">
            ${isCouture ? 'Édition Impériale' : isNoir ? 'Pandiones Noir' : 'Rosa Seta'}
          </span>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.65; display: block;">
            Nominal Değer
          </span>
          <span style="font-size: 26px; font-family: Georgia, serif; font-weight: 600; color: ${cardAccent};">
            ₺${data.initialBalance.toLocaleString('tr-TR')}
          </span>
        </div>
      </div>

      <div style="margin: 20px 0; padding: 14px 18px; background: rgba(0,0,0,0.03); border: 1px dashed ${cardBorder}; border-radius: 8px; text-align: center;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; opacity: 0.7; display: block; margin-bottom: 4px;">
          Hediye Kartı Kodunuz
        </span>
        <code style="font-size: 18px; font-weight: 700; letter-spacing: 0.15em; color: ${cardAccent};">
          ${data.code}
        </code>
      </div>

      ${
        data.giftNote
          ? `<div style="margin: 16px 0; font-family: Georgia, serif; font-style: italic; font-size: 13.5px; opacity: 0.9; line-height: 1.5; border-left: 2px solid ${cardAccent}; padding-left: 12px;">
              &ldquo;${data.giftNote}&rdquo;
            </div>`
          : ''
      }

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.08); font-size: 11px; opacity: 0.8;">
        <div>
          <span>Alıcı: <strong>${data.recipientName}</strong></span>
          ${data.senderName ? `<span style="margin-left: 12px;">Gönderen: <strong>${data.senderName}</strong></span>` : ''}
        </div>
        <div>
          <span>Geçerlilik: <strong>${formattedExpiry}</strong></span>
        </div>
      </div>
    </div>

    <p style="font-size: 13px; color: #555555; line-height: 1.6;">
      <strong>Nasıl Kullanılır?</strong><br>
      Koleksiyonumuzdan dilediğiniz parçaları sepetinize ekleyin. Çanta veya ödeme adımında <code>${data.code}</code> kodunu kupon alanına girerek bakiyenizi tek seferde veya bölünerek 2 yıl boyunca özgürce kullanabilirsiniz.
    </p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${SITE_URL}/koleksiyon" class="btn">Koleksiyonu Keşfet & Kullan</a>
    </div>
  `;

  const text = `PANDIONES
Size Özel Bir Pandiones Hediye Kartı Armağan Edildi

Sayın ${data.recipientName},
${data.senderName ? `${data.senderName}` : 'Bir yakınınız'} sizin için özel bir Pandiones Dijital Hediye Kartı hazırladı.

Hediye Kartı Kodu: ${data.code}
Bakiye: ₺${data.initialBalance.toLocaleString('tr-TR')}
Son Geçerlilik Tarihi: ${formattedExpiry}
${data.giftNote ? `\nHediye Notu: "${data.giftNote}"\n` : ''}

Nasıl Kullanılır:
pandiones.com adresinde beğendiğiniz parçaları seçip ödeme adımında hediye kartı kodunuzu girerek bakiyenizi kullanabilirsiniz.

Koleksiyonu keşfetmek için:
${SITE_URL}/koleksiyon

Pandiones — Doğal ipek, saf zanaat ve zamansız estetik.`;

  return {
    subject,
    html: baseEmailHtml(subject, bodyContent),
    text,
  };
}

