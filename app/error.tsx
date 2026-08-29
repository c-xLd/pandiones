'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import { RotateCcw, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Runtime error caught by error boundary:', error);
  }, [error]);

  return (
    <main className="shop-page error-page min-h-screen flex flex-col bg-[var(--bone)] text-[var(--ink)]">
      <SiteHeader />

      <section className="flex-1 flex flex-col justify-center px-6 py-12 md:py-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="border-b border-[var(--line)] pb-6 mb-8">
              <span className="text-[10px] tracking-[0.28em] uppercase text-[var(--destructive)]">
                PANDIONES / BEKLENMEYEN DURUM // 500
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-medium">
                SİSTEM // AKIŞI
              </p>
              <h1 className="font-editorial text-5xl sm:text-7xl md:text-8xl font-light uppercase tracking-[-0.04em] leading-[0.9]">
                BİR KESİNTİ <br />
                <i className="italic font-normal">OLUŞTU.</i>
              </h1>
              <p className="text-xs md:text-sm text-[var(--muted-foreground)] tracking-wide uppercase max-w-md pt-3 leading-relaxed">
                İşlem sırasında beklenmedik bir hata meydana geldi. Sayfayı yeniden deneyebilir veya ana sayfaya dönebilirsiniz.
              </p>
              {error.digest && (
                <p className="text-[10px] font-mono text-[var(--muted-foreground)] opacity-60">
                  HATA KODU: {error.digest}
                </p>
              )}
            </div>

            <div className="pt-8 sm:pt-12 flex flex-wrap items-center gap-4">
              <Button
                type="button"
                size="lg"
                onClick={() => reset()}
                className="h-13 px-8 text-xs tracking-[0.2em]"
              >
                TEKRAR DENE <RotateCcw className="size-4 ml-2" />
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-8 text-xs tracking-[0.2em]">
                <Link href="/" prefetch={true}>
                  ANA SAYFAYA DÖN <ArrowUpRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="relative aspect-[3/4] w-full overflow-hidden border border-[var(--line)] bg-[#0b0909]">
              <img
                src="/products/cizgili-dantelli-takim.jpg"
                alt="Pandiones koleksiyon görseli"
                className="h-full w-full object-cover object-center brightness-90 contrast-105"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-[var(--bone)]">
                <span className="text-[9px] tracking-[0.2em] uppercase">PANDIONES ARCHIVE</span>
                <span className="text-[9px] tracking-[0.2em] uppercase opacity-70">2026</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
