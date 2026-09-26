import React from 'react';
import CollectionClient from '../CollectionClient';

export const metadata = {
  title: 'Yeni Gelenler — PANDIONES Lüks İç Giyim & Ev Giyim',
  description: 'Pandiones en yeni sezon tasarımları, saf ipek ve İtalyan danteli lüks koleksiyon parçaları.',
  alternates: {
    canonical: 'https://pandiones.com/koleksiyon/yeni-gelenler',
  },
};

export default function YeniGelenlerPage() {
  return (
    <CollectionClient
      currentCategory="yeni-gelenler"
      title="Yeni Gelenler"
    />
  );
}
