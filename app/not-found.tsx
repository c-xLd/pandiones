import Link from 'next/link';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const quickLinks = [
    { num: '01', title: 'TÜM KOLEKSİYON', desc: 'Yeni sezon seçkileri', href: '/koleksiyon' },
    { num: '02', title: 'İÇ GİYİM', desc: 'Dantel ve destekli takımlar', href: '/ic-giyim' },
    { num: '03', title: 'CROP BÜSTİYER', desc: 'Günlük ve fitilli formlar', href: '/crop-bustiyer' },
    { num: '04', title: 'GECELİK & TÜL', desc: 'Hafif ve feminen silüetler', href: '/gecelik' },
  ];

  return (
    <main className="shop-page not-found-page min-h-screen flex flex-col bg-[var(--bone)] text-[var(--ink)]">
      <SiteHeader />

      <section className="flex-1 flex flex-col justify-center px-6 py-12 md:py-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Zara-inspired High Typography */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="border-b border-[var(--line)] pb-6 mb-8">
              <span className="text-[10px] tracking-[0.28em] uppercase text-[var(--muted-foreground)]">
                PANDIONES / 404 // NOT FOUND
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-medium">
                DROP // 00
              </p>
              <h1 className="font-editorial text-5xl sm:text-7xl md:text-8xl font-light uppercase tracking-[-0.04em] leading-[0.9]">
                KAYIP <br />
                <i className="italic font-normal">SİLÜET.</i>
              </h1>
              <p className="text-xs md:text-sm text-[var(--muted-foreground)] tracking-wide uppercase max-w-md pt-3 leading-relaxed">
                Aradığınız parça koleksiyondan kalkmış veya adresi değişmiş olabilir. Teninize eşlik edecek diğer tasarımları keşfedin.
              </p>
            </div>

            {/* Direct CTA */}
            <div className="pt-8 sm:pt-12 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-13 px-8 text-xs tracking-[0.2em]">
                <Link href="/" prefetch={true}>
                  ANA SAYFAYA DÖN <ArrowUpRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-8 text-xs tracking-[0.2em]">
                <Link href="/koleksiyon" prefetch={true}>
                  KOLEKSİYONU GÖR
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Editorial Visual & Discovery Matrix */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="relative aspect-[3/4] w-full overflow-hidden border border-[var(--line)] bg-[#0b0909]">
              <img
                src="/products/simli-bustiyer-takim.jpg"
                alt="Pandiones koleksiyon görseli"
                className="h-full w-full object-cover object-center brightness-90 contrast-105 hover:scale-105 transition-transform duration-700 ease-out"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-[var(--bone)]">
                <span className="text-[9px] tracking-[0.2em] uppercase">PANDIONES EDITORIAL</span>
                <span className="text-[9px] tracking-[0.2em] uppercase opacity-70">2026</span>
              </div>
            </div>

            {/* Quick Editorial Directory */}
            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {quickLinks.map((item) => (
                <Link
                  key={item.num}
                  href={item.href}
                  prefetch={true}
                  className="group flex items-center justify-between py-3.5 px-1 hover:bg-[var(--secondary)]/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono tracking-widest text-[var(--muted-foreground)]">
                      {item.num}
                    </span>
                    <div className="text-left">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-[10px] text-[var(--muted-foreground)] tracking-wider uppercase">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 text-[var(--muted-foreground)] group-hover:text-[var(--ink)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

