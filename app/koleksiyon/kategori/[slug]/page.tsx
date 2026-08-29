import { notFound, permanentRedirect } from 'next/navigation';

const validSlugs = ['ic-giyim', 'crop-bustiyer', 'gecelik'];

export default async function CollectionCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (validSlugs.includes(slug)) {
    permanentRedirect(`/${slug}`);
  }
  notFound();
}

