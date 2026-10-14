'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '../../_components/AdminShell';
import { ProductEditorForm, type AdminProduct } from '../../_components/products/ProductEditor';
import AdminIcon from '../../_components/AdminIcon';


export default function EditProductPage() {
  const params = useParams();
  const rawId = params?.id;
  const productId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const [product, setProduct] = useState<AdminProduct | null>(null);

  const title = product?.name || 'Ürünü düzenle';
  const lead = product ? `${product.color} rengini düzenliyorsunuz. Bilgiler ve tablo kaydet çubuğundan, görseller renk medyasında hemen kaydedilir.` : 'Ürün bilgilerini, renkleri, beden stoklarını ve görselleri güncelleyin.';

  return (
    <AdminShell
      currentTab="products"
      eyebrow="Katalog / Ürünler"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span>{title}</span>
          {product ? (
            <span className={`adm-status adm-status--${product.status === 'DRAFT' ? 'warning' : 'success'}`} style={{ fontSize: 'var(--text-xs)', verticalAlign: 'middle' }}>
              {product.status === 'DRAFT' ? 'Taslak' : 'Yayında'}
            </span>
          ) : null}
        </span>
      }
      lead={lead}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Link href="/yonetim?tab=products" className="adm-btn adm-btn--sm">
            <AdminIcon name="arrow-left" />
            <span>Ürün listesine dön</span>
          </Link>
          {product?.status === 'PUBLISHED' && product.slug ? (
            <Link
              href={`/urun/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn adm-btn--sm adm-btn--quiet"
              title="Mağazada incele"
            >
              <span>Mağazada gör</span>
              <AdminIcon name="arrow" />
            </Link>
          ) : null}
        </div>
      }
    >
      <ProductEditorForm
        productId={productId}
        onSaved={() => {}}
        onProductLoaded={setProduct}
      />
    </AdminShell>
  );
}
