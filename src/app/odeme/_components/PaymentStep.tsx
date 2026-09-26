'use client';

import React, { useEffect, useRef } from 'react';
import Notice from '@/components/ui/Notice';

type Props = {
  /** `checkoutFormContent` from iyzico (a bootstrap script) or the dev simulator markup. */
  html: string;
  isTestMode: boolean;
  recipient: string;
  addressLine: string;
  onEdit: () => void;
};

/**
 * Put provider content into `host` and make its scripts run. iyzico's bootstrap skips
 * itself when `window.iyziInit` exists, so a second token (after "Bilgileri düzenle")
 * needs the previous bootstrap and rendered form cleared first.
 */
export function mountProviderContent(host: HTMLElement, html: string): void {
  // `var iyziInit` is a non-configurable global; delete would throw in strict mode.
  (window as unknown as { iyziInit?: unknown }).iyziInit = undefined;
  const target = document.getElementById('iyzipay-checkout-form');
  if (target) target.innerHTML = '';

  host.innerHTML = html;
  host.querySelectorAll('script').forEach((oldScript) => {
    const script = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
    script.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode?.replaceChild(script, oldScript);
  });
}

export default function PaymentStep({ html, isTestMode, recipient, addressLine, onEdit }: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    mountProviderContent(host, html);
    return () => {
      host.innerHTML = '';
    };
  }, [html]);

  return (
    <section className="checkout-section payment-step" aria-labelledby="payment-step-title">
      <h2 id="payment-step-title" ref={headingRef} tabIndex={-1} className="checkout-section-title">2. Güvenli ödeme</h2>
      <div className="payment-step__summary">
        <p>
          <span className="payment-step__label">Teslimat</span>
          {recipient} · {addressLine}
        </p>
        <button type="button" className="btn btn--link" onClick={onEdit}>Bilgileri düzenle</button>
      </div>
      {isTestMode ? (
        <Notice tone="warning" role="status" className="payment-step__notice">
          <p>Test modu — gerçek ödeme alınmaz.</p>
        </Notice>
      ) : null}
      <div id="iyzipay-checkout-form" className="responsive" />
      <div ref={hostRef} className="payment-step__host" />
    </section>
  );
}
