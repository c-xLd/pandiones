'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import SizeChartTable from '@/components/guides/SizeChartTable';
import { MEASURE_LABELS, recommendSize, type Measure } from '@/lib/products/size-chart';

const MEASURES = Object.keys(MEASURE_LABELS) as Measure[];
const MIN_CM = 40;
const MAX_CM = 200;

const EXAMPLES: Record<Measure, string> = { bust: 'örn. 88', waist: 'örn. 68', hip: 'örn. 94' };

const HINTS: Record<Measure, string> = {
  bust: 'En dolgun noktadan, mezurayı sıkmadan.',
  waist: 'Doğal bel çizgisinden, göbeğin hemen üstü.',
  hip: 'Kalçanın en geniş noktasından.',
};

type Values = Record<Measure, string>;

function parseCm(raw: string): { value: number | null; error?: string } {
  const text = raw.trim().replace(',', '.');
  if (!text) return { value: null };
  const value = Number(text);
  if (!Number.isFinite(value)) return { value: null, error: 'Yalnız rakam girin.' };
  if (value < MIN_CM || value > MAX_CM) return { value: null, error: `${MIN_CM}–${MAX_CM} cm arasında bir değer girin.` };
  return { value };
}

export default function SizeFinder() {
  const [values, setValues] = useState<Values>({ bust: '', waist: '', hip: '' });

  const parsed = useMemo(
    () => Object.fromEntries(MEASURES.map((measure) => [measure, parseCm(values[measure])])) as Record<Measure, ReturnType<typeof parseCm>>,
    [values],
  );
  const result = useMemo(
    () => recommendSize(Object.fromEntries(MEASURES.map((measure) => [measure, parsed[measure].value]))),
    [parsed],
  );

  return (
    <>
      <section id="bedenini-bul" className="guide-section" aria-labelledby="finder-title">
        <div className="guide-section__head">
          <p className="guide-section__num" aria-hidden="true">01</p>
          <h2 id="finder-title" className="guide-section__title">Bedenini bul</h2>
          <p className="guide-section__text">Bir, iki ya da üç ölçü girebilirsin. Ne kadar çok ölçü, o kadar isabetli öneri.</p>
        </div>

        <div className="size-finder">
          <form className="size-finder__form" onSubmit={(event) => event.preventDefault()} noValidate>
            {MEASURES.map((measure) => (
              <FormField key={measure} id={`measure-${measure}`} label={`${MEASURE_LABELS[measure]} çevresi (cm)`} hint={HINTS[measure]} error={parsed[measure].error}>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={EXAMPLES[measure]}
                  value={values[measure]}
                  onChange={(event) => setValues((current) => ({ ...current, [measure]: event.target.value }))}
                />
              </FormField>
            ))}
            {MEASURES.some((measure) => values[measure]) ? (
              <button type="button" className="btn btn--link size-finder__reset" onClick={() => setValues({ bust: '', waist: '', hip: '' })}>
                Ölçüleri temizle
              </button>
            ) : null}
          </form>

          <div className={`size-result${result.row ? ' has-result' : ''}`} aria-live="polite">
            {result.row ? (
              <>
                <p className="size-result__label">Önerilen beden</p>
                <p className="size-result__size" key={result.row.size}>
                  {result.row.size}
                  <span className="size-result__tr">TR {result.row.tr}</span>
                </p>
                <dl className="size-result__breakdown">
                  {MEASURES.filter((measure) => result.perMeasure[measure]).map((measure) => {
                    const match = result.perMeasure[measure]!;
                    return (
                      <div key={measure}>
                        <dt>{MEASURE_LABELS[measure]}</dt>
                        <dd>
                          {match.kind === 'fit' ? match.row.size : match.kind === 'below' ? `${match.row.size} altı` : `${match.row.size} üstü`}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                {result.outOfRange ? (
                  <p className="size-result__note">
                    Ölçülerinden biri tablonun dışında. Seçmeden önce <Link href="/iletisim">bize yaz</Link>; parçaya göre yardımcı olalım.
                  </p>
                ) : result.mixed ? (
                  <p className="size-result__note">Ölçülerin farklı bedenlere denk geliyor. Rahat bir oturuş için büyük olanı önerdik.</p>
                ) : null}
                <Link href="/yeni-gelenler" className="btn btn--primary btn--block">Yeni gelenlere göz at</Link>
              </>
            ) : (
              <>
                <p className="size-result__label">Önerilen beden</p>
                <p className="size-result__placeholder" aria-hidden="true">—</p>
                <p className="size-result__empty">Ölçü girdiğinde bedenin burada ve tabloda görünür.</p>
              </>
            )}
          </div>
        </div>
      </section>

      <section id="beden-tablosu" className="guide-section" aria-labelledby="chart-title">
        <div className="guide-section__head">
          <p className="guide-section__num" aria-hidden="true">02</p>
          <h2 id="chart-title" className="guide-section__title">Beden tablosu</h2>
          <p className="guide-section__text">Tüm iç giyim ve ev giyim parçaları için geçerlidir. Ölçüler vücut ölçüsüdür, ürün ölçüsü değil.</p>
        </div>
        <div className="size-chart-wrap">
          <SizeChartTable highlight={result.row?.size} caption="Türkiye beden tablosu, santimetre" />
        </div>
      </section>
    </>
  );
}
