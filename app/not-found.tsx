import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <span className="text-xs uppercase tracking-widest text-neutral-500 mb-2">404</span>
      <h1 className="text-3xl font-serif mb-4">Sayfa Bulunamadı</h1>
      <p className="text-sm text-neutral-600 max-w-md mb-8">
        Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir.
      </p>
      <Link 
        href="/" 
        className="px-6 py-3 border border-current text-xs uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-colors"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
