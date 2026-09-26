import React from 'react';
import { notFound, redirect } from 'next/navigation';
import CollectionClient from '../CollectionClient';

import { getCategoryBySlug } from '@/lib/categories';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kategori: string }>;
}) {
  const { kategori } = await params;

  if (kategori === 'ic-giyim') {
    return {
      title: 'İç Giyim Koleksiyonu — PANDIONES Lüks İç Giyim',
      description: 'Zarif dantel sütyen ve külot takımları, ipeksi dokular ve vücudu kusursuz saran lüks parçalar.',
      alternates: {
        canonical: 'https://pandiones.com/koleksiyon/ic-giyim',
      },
    };
  }

  if (kategori === 'ev-giyim') {
    return {
      title: 'Ev Giyim & Pijama Koleksiyonu — PANDIONES',
      description: 'Saf saten ve ipek pijama takımları, sabahlıklar ve dingin anlara eşlik eden lüks ev giyimi.',
      alternates: {
        canonical: 'https://pandiones.com/koleksiyon/ev-giyim',
      },
    };
  }

  const category = await getCategoryBySlug(kategori);
  if (category) {
    return {
      title: `${category.name} Koleksiyonu — PANDIONES`,
      description: category.description || `${category.name} seçkin parçalar ve lüks tasarımlar.`,
      alternates: {
        canonical: `https://pandiones.com/koleksiyon/${category.slug}`,
      },
    };
  }

  return {
    title: 'Koleksiyon — PANDIONES',
  };
}

export default async function CategoryCollectionPage({
  params,
}: {
  params: Promise<{ kategori: string }>;
}) {
  const { kategori } = await params;

  if (kategori === 'lingerie') {
    redirect('/koleksiyon/ic-giyim');
  }
  if (kategori === 'sleep') {
    redirect('/koleksiyon/ev-giyim');
  }

  const categoryTitles: Record<string, string> = {
    'ic-giyim': 'İç Giyim Koleksiyonu',
    'ev-giyim': 'Ev Giyim & Dinlenme',
  };

  let title = categoryTitles[kategori];

  if (!title) {
    const category = await getCategoryBySlug(kategori);
    if (!category) {
      notFound();
    }
    title = `${category.name} Koleksiyonu`;
  }

  return (
    <CollectionClient
      currentCategory={kategori}
      title={title}
    />
  );
}
