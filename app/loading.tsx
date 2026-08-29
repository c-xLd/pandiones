export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bone)] flex flex-col justify-between p-8" aria-live="polite" aria-busy="true">
      {/* Top Header Placeholder */}
      <div className="flex justify-between items-center border-b border-[var(--line)] pb-5">
        <span className="font-brand text-sm tracking-widest text-[var(--ink)] animate-pulse">PANDIONES</span>
        <div className="h-2 w-24 bg-[var(--line)] animate-pulse" />
      </div>

      {/* Center Cinematic Loading Cue */}
      <div className="max-w-xl mx-auto text-center space-y-6">
        <div className="inline-block relative">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--accent)] font-medium">
            YÜKLENİYOR // LIVING FABRIC
          </span>
          <div className="h-0.5 w-full bg-[var(--accent)] mt-2 animate-pulse" />
        </div>
        <p className="font-editorial text-3xl md:text-4xl uppercase tracking-[-0.02em] font-light text-[var(--ink)]">
          Koleksiyon <i className="italic font-normal">Hazırlanıyor</i>
        </p>
      </div>

      {/* Bottom Subtle Bar */}
      <div className="flex justify-between text-[9px] tracking-widest text-[var(--muted-foreground)] uppercase border-t border-[var(--line)] pt-4">
        <span>PANDIONES / 2026</span>
        <span>LÜTFEN BEKLEYİN</span>
      </div>
    </div>
  );
}
