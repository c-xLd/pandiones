import type { ReactNode } from 'react';
import SiteFooter from './site-footer';
import SiteHeader from './site-header';

type InfoVariant = 'size' | 'delivery' | 'contact' | 'legal';

export default function InfoPage({ kicker, title, intro, accent, variant, children }: { kicker: string; title: string; intro: string; accent: string; variant: InfoVariant; children: ReactNode }) {
  return <main className={`shop-page info-page info-page--${variant}`}><SiteHeader /><section className={`info-hero info-hero--${variant}`}><div className="info-hero-meta"><p>{kicker}</p><span>PANDIONES / 2026</span></div><div className="info-hero-title"><h1>{title}</h1><strong aria-hidden="true">{accent}</strong></div><p className="info-hero-intro">{intro}</p></section><section className="info-content">{children}</section><SiteFooter /></main>;
}
