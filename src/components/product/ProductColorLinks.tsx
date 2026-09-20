import React from 'react';
import Link from 'next/link';
import type { Product, SiblingColor } from '@/types';

const rootStyle: React.CSSProperties = { maxWidth: 1440, margin: '0 auto', padding: '12px clamp(20px, 4vw, 64px)', fontSize: 11, color: 'var(--ink)' };
const linkStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: 36, border: '1px solid var(--line)', padding: '8px 12px', color: 'var(--ink)', textDecoration: 'none' };

export default function ProductColorLinks({ current, siblings = [] }: { current: Product; siblings?: SiblingColor[] }) {
  const linked = siblings.filter((sibling) => sibling.id !== current.id && sibling.image);
  if (!linked.length) return <p style={rootStyle}>Renk <strong style={{ marginLeft: 9 }}>{current.color}</strong></p>;

  return <div style={rootStyle} aria-label="Renk seçenekleri">
    <p style={{ margin: '0 0 7px' }}>Renk <strong style={{ marginLeft: 9 }}>{current.color}</strong></p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{linked.map((sibling) => <Link key={sibling.id} href={`/koleksiyon/${sibling.category}/${sibling.slug}`} style={linkStyle} aria-label={`${sibling.color} rengini incele`}>{sibling.color}</Link>)}</div>
  </div>;
}
