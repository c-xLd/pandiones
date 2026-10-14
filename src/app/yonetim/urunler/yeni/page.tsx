'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '../../_components/AdminShell';
import { ProductEditorForm } from '../../_components/products/ProductEditor';
import AdminIcon from '../../_components/AdminIcon';

export default function NewProductPage() {
  const router = useRouter();

  return (
    <AdminShell
      currentTab="products"
      eyebrow="Katalog / Ürünler"
      title="Yeni ürün"
      lead="Ürün bilgilerini, renkleri ve bedenleri girin. Görselleri renk tablosundan hemen seçebilirsiniz; taslakla birlikte yüklenir."
      actions={
        <Link href="/yonetim?tab=products" className="adm-btn adm-btn--sm">
          <AdminIcon name="arrow-left" />
          <span>Ürün listesine dön</span>
        </Link>
      }
    >
      <ProductEditorForm
        onSaved={() => {}}
        onCreated={(newId) => {
          router.replace(`/yonetim/urunler/${newId}`);
        }}
      />
    </AdminShell>
  );
}
