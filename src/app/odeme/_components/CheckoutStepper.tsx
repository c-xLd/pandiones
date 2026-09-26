import React from 'react';

const STEPS = ['İletişim ve adres', 'Güvenli ödeme', 'Sipariş onayı'] as const;

export default function CheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="checkout-stepper" aria-label="Ödeme adımları">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const state = step === current ? 'is-current' : step < current ? 'is-done' : '';
        return (
          <li
            key={label}
            className={['checkout-step', state].filter(Boolean).join(' ')}
            aria-current={step === current ? 'step' : undefined}
          >
            <span className="checkout-step__index" aria-hidden="true">{step < current ? '✓' : step}</span>
            <span className="checkout-step__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
