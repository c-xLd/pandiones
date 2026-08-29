import Link from 'next/link';

export default function SearchSuggestions() {
  return (
    <section className="search-suggestions">
      <Link href="/koleksiyon" prefetch={true}>
        Tüm Koleksiyon <span>→</span>
      </Link>
      <Link href="/beden-rehberi" prefetch={true}>
        Beden Rehberi <span>→</span>
      </Link>
      <Link href="/teslimat-iade" prefetch={true}>
        Teslimat & İade <span>→</span>
      </Link>
    </section>
  );
}

