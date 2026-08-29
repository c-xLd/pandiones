'use client';

import { useState } from 'react';
import { Check, LoaderCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddToCart({ productId, productName, productImage, sizes }: { productId: string; productName: string; productImage: string; sizes: string[] }) {
  const [size, setSize] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const add = async () => {
    if (!size) {
      setStatus('error');
      setMessage('Önce beden seçmelisin.');
      return;
    }
    setStatus('loading');
    setMessage('');
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, size, quantity: 1 }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setStatus('error');
      setMessage(data?.error ?? 'Ürün çantaya eklenemedi.');
      return;
    }
    setStatus('success');
    setMessage('Ürün çantana eklendi.');
    window.dispatchEvent(new Event('pandiones:cart'));
    window.setTimeout(() => { setStatus('idle'); setMessage(''); }, 3200);
  };

  return (
    <div className="add-panel">
      <fieldset>
        <legend>Beden seç</legend>
        <div className="size-list">
          {sizes.map((item) => <button key={item} type="button" className={size === item ? 'selected' : ''} aria-pressed={size === item} onClick={() => { setSize(item); setStatus('idle'); setMessage(''); }}>{item}</button>)}
        </div>
      </fieldset>
      <Button className={`add-button ${status === 'success' ? 'is-success' : ''}`} size="lg" type="button" disabled={status === 'loading'} onClick={add}>
        <span>{status === 'loading' ? 'Ekleniyor…' : status === 'success' ? 'Çantaya eklendi' : 'Çantaya ekle'}</span>
        {status === 'loading' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : status === 'success' ? <Check aria-hidden="true" /> : <ShoppingBag aria-hidden="true" />}
      </Button>
      <p className={`form-status ${status}`} role="status" aria-live="polite">{message}</p>
      <div className={`cart-add-toast ${status === 'success' ? 'visible' : ''}`} aria-hidden={status !== 'success'}>
        <img src={productImage} alt="" />
        <div><span>ÇANTAYA EKLENDİ / {size}</span><strong>{productName}</strong><a href="/sepet">Çantayı görüntüle ↗</a></div>
        <i aria-hidden="true">✓</i>
      </div>
    </div>
  );
}
