import type { Metadata } from 'next';
import ProductCard from '@/components/product-card';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Arama | Pandiones', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim() ?? '';
  const products = query.length >= 2 ? await getProducts({ query }) : [];
  return <main className="shop-page"><SiteHeader /><section className="search-page"><p>NE ARIYORSUN?</p><h1>ARAMA</h1><form action="/arama"><label className="sr-only" htmlFor="q">Ürün ara</label><Input id="q" name="q" defaultValue={query} placeholder="Ürün, renk veya koleksiyon" minLength={2} autoFocus /><Button variant="ghost" type="submit">Ara ↗</Button></form>{query && <div className="search-result-head"><span>“{query}” için sonuçlar</span><span>{products.length} ürün</span></div>}</section>{query ? products.length ? <section className="catalog-grid search-grid">{products.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}</section> : <section className="catalog-empty"><h2>Aradığın ifadeyle eşleşen ürün yok.</h2><a href="/koleksiyon">Koleksiyonu gör ↗</a></section> : <section className="search-suggestions"><a href="/koleksiyon">Tüm Koleksiyon <span>↗</span></a><a href="/beden-rehberi">Beden Rehberi <span>↗</span></a><a href="/teslimat-iade">Teslimat & İade <span>↗</span></a></section>}<SiteFooter /></main>;
}
