'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, LoaderCircle, LockKeyhole, Minus, Plus, RotateCcw, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CartItem = { id: string; productId: string; slug: string; name: string; image: string; color: string; size: string; quantity: number; priceKurus: number; lineTotal: number };
type CartData = { items: CartItem[]; count: number; subtotal: number };

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value / 100);

export default function CartView() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);

  const publish = (data: CartData) => {
    setCart(data);
    window.dispatchEvent(new Event('pandiones:cart'));
  };

  const load = async () => {
    setError('');
    const response = await fetch('/api/cart', { cache: 'no-store' });
    if (!response.ok) { setError('Çantan şu anda yüklenemedi.'); return; }
    publish(await response.json() as CartData);
  };

  useEffect(() => {
    let active = true;
    fetch('/api/cart', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('cart');
        const data = await response.json() as CartData;
        if (active) setCart(data);
      })
      .catch(() => { if (active) setError('Çantan şu anda yüklenemedi.'); });
    return () => { active = false; };
  }, []);

  const mutate = async (method: 'PATCH' | 'DELETE', item: CartItem, quantity?: number) => {
    setError('');
    setPendingId(item.id);
    const response = await fetch('/api/cart', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, quantity }) });
    if (!response.ok) {
      setError('Çanta güncellenemedi. Lütfen tekrar dene.');
      setPendingId('');
      return;
    }
    publish(await response.json() as CartData);
    if (method === 'DELETE') setLastRemoved(item);
    setPendingId('');
  };

  const undoRemove = async () => {
    if (!lastRemoved) return;
    setPendingId('undo');
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: lastRemoved.productId, size: lastRemoved.size, quantity: lastRemoved.quantity }),
    });
    if (!response.ok) {
      setError('Ürün çantaya geri alınamadı.');
      setPendingId('');
      return;
    }
    publish(await response.json() as CartData);
    setLastRemoved(null);
    setPendingId('');
  };

  if (!cart && !error) return <div className="cart-loading-v2" aria-live="polite"><ShoppingBag aria-hidden="true" /><span>Çantan hazırlanıyor</span><i /></div>;
  if (error && !cart) return <div className="cart-empty-v2"><span>BAĞLANTI HATASI</span><h2>Çantana şu an<br /><i>ulaşamıyoruz.</i></h2><p>{error}</p><Button variant="outline" type="button" onClick={load}>Tekrar dene <RotateCcw aria-hidden="true" /></Button></div>;
  if (!cart?.items.length) return <div className="cart-empty-v2"><span>ÇANTAN / 00</span><ShoppingBag className="cart-empty-icon" aria-hidden="true" /><h2>Henüz bir seçim<br /><i>yapmadın.</i></h2><p>Koleksiyondan sana eşlik edecek parçaları seç; bedenini belirle ve çantana ekle.</p><Button asChild size="lg"><Link href="/koleksiyon" prefetch={true}>Koleksiyonu keşfet <ArrowRight aria-hidden="true" /></Link></Button><div className="cart-empty-links"><Link href="/ic-giyim" prefetch={true}>İç Giyim</Link><Link href="/crop-bustiyer" prefetch={true}>Crop Büstiyer</Link><Link href="/gecelik" prefetch={true}>Gecelik</Link><Link href="/beden-rehberi" prefetch={true}>Beden Rehberi</Link></div></div>;

  return (
    <div className="cart-layout-v2">
      <section className="cart-items-v2" aria-label="Çantadaki ürünler">
        <header><div><span>SEÇİMLERİN</span><strong>{cart.count.toString().padStart(2, '0')} PARÇA</strong></div><Link href="/koleksiyon" prefetch={true}>Alışverişe devam et <ArrowRight aria-hidden="true" /></Link></header>
        {cart.items.map((item, index) => {
          const pending = pendingId === item.id;
          return <article className={`cart-item-v2 ${pending ? 'is-pending' : ''}`} key={item.id}>
            <Link className="cart-item-media-v2" href={`/urun/${item.slug}`} prefetch={true}><img src={item.image} alt={`${item.name}, ${item.color}`} loading="lazy" decoding="async" /><span>0{index + 1}</span></Link>
            <div className="cart-item-main-v2">
              <div className="cart-item-title-v2"><p>{item.color} / {item.size} BEDEN</p><h2><Link href={`/urun/${item.slug}`} prefetch={true}>{item.name}</Link></h2><span>Birim fiyat · {money(item.priceKurus)}</span></div>
              <div className="cart-item-controls-v2">
                <div className="quantity-control-v2" aria-label={`${item.name} adet`}>
                  <button type="button" aria-label="Adedi azalt" disabled={pending || item.quantity <= 1} onClick={() => mutate('PATCH', item, item.quantity - 1)}><Minus aria-hidden="true" /></button>
                  <span>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : item.quantity}</span>
                  <button type="button" aria-label="Adedi artır" disabled={pending || item.quantity >= 10} onClick={() => mutate('PATCH', item, item.quantity + 1)}><Plus aria-hidden="true" /></button>
                </div>
                <button className="remove-item-v2" type="button" disabled={pending} onClick={() => mutate('DELETE', item)}><Trash2 aria-hidden="true" /> Kaldır</button>
              </div>
            </div>
            <strong className="cart-line-total-v2">{money(item.lineTotal)}</strong>
          </article>;
        })}
        {error && <p className="cart-error-v2" role="alert">{error}</p>}
      </section>
      <aside className="cart-summary-v2">
        <div className="cart-summary-kicker"><span>SİPARİŞ ÖZETİ</span><ShoppingBag aria-hidden="true" /></div>
        <dl><div><dt>Ara toplam <small>{cart.count} parça</small></dt><dd>{money(cart.subtotal)}</dd></div><div><dt>Kargo</dt><dd>Ödeme adımında</dd></div></dl>
        <div className="cart-total-v2"><span>TOPLAM <small>KDV dahil</small></span><strong>{money(cart.subtotal)}</strong></div>
        <Button className="cart-checkout-v2" size="lg" type="button" disabled title="Ödeme altyapısı bağlandıktan sonra açılacak"><LockKeyhole aria-hidden="true" /> Güvenli ödemeye geç <ArrowRight aria-hidden="true" /></Button>
        <p className="cart-payment-note-v2">PayTR güvenli ödeme bağlantısı tamamlandığında ödeme adımı aktif olacaktır.</p>
        <ul className="cart-assurances-v2"><li><Check aria-hidden="true" /><span><strong>Güvenli ödeme</strong>Ödeme bilgileriniz korunur.</span></li><li><Check aria-hidden="true" /><span><strong>Beden desteği</strong>Seçim öncesi rehberi inceleyin.</span></li><li><Check aria-hidden="true" /><span><strong>Teslimat takibi</strong>Siparişiniz adım adım izlenir.</span></li></ul>
        <div className="cart-summary-links-v2"><Link href="/teslimat-iade" prefetch={true}>Teslimat & İade <ArrowRight aria-hidden="true" /></Link><Link href="/beden-rehberi" prefetch={true}>Beden Rehberi <ArrowRight aria-hidden="true" /></Link></div>
      </aside>
      {lastRemoved && <div className="cart-undo-toast" role="status"><div><Trash2 aria-hidden="true" /><span><strong>Ürün çantadan çıkarıldı.</strong>{lastRemoved.name}</span></div><Button variant="ghost" type="button" disabled={pendingId === 'undo'} onClick={undoRemove}>{pendingId === 'undo' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />} Geri al</Button><button aria-label="Bildirimi kapat" type="button" onClick={() => setLastRemoved(null)}>×</button></div>}
    </div>
  );
}

