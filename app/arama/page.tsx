import type { Metadata } from 'next';
import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import SearchForm from '@/components/arama/search-form';
import SearchResults from '@/components/arama/search-results';
import SearchSuggestions from '@/components/arama/search-suggestions';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = { 
  title: 'Arama | Pandiones', 
  robots: { index: false, follow: true } 
};

export default async function SearchPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> 
}) {
  const query = (await searchParams).q?.trim() ?? '';
  const products = query.length >= 2 ? await getProducts({ query }) : [];

  return (
    <main className="shop-page">
      <SiteHeader />
      <SearchForm query={query} count={products.length} />
      {query ? <SearchResults products={products} /> : <SearchSuggestions />}
      <SiteFooter />
    </main>
  );
}
