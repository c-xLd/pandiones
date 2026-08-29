import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SearchForm({ query, count }: { query: string; count?: number }) {
  return (
    <section className="search-page">
      <p>NE ARIYORSUN?</p>
      <h1>ARAMA</h1>
      <form action="/arama">
        <label className="sr-only" htmlFor="q">
          Ürün ara
        </label>
        <Input id="q" name="q" defaultValue={query} placeholder="Ürün, renk veya koleksiyon" minLength={2} autoFocus />
        <Button variant="ghost" type="submit">
          Ara →
        </Button>
      </form>
      {query && (
        <div className="search-result-head">
          <span>“{query}” için sonuçlar</span>
          <span>{count} ürün</span>
        </div>
      )}
    </section>
  );
}
