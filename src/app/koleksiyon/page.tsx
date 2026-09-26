import React from 'react';
import { redirect } from 'next/navigation';
import CollectionClient from './CollectionClient';

export const metadata = {
  title: 'Tüm Koleksiyon — PANDIONES Lüks İç Giyim & Ev Giyim',
  description: 'Pandiones zamansız iç giyim ve ev giyim koleksiyonu. İtalyan danteli ve saf ipek parçalar.',
};

export default async function KoleksiyonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawParam = params?.kategori || params?.category;

  if (rawParam === 'ic-giyim' || rawParam === 'lingerie') {
    redirect('/koleksiyon/ic-giyim');
  }
  if (rawParam === 'ev-giyim' || rawParam === 'sleep') {
    redirect('/koleksiyon/ev-giyim');
  }

  return <CollectionClient currentCategory="tumu" title="Tüm Koleksiyon" />;
}

