'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import FormField from '@/components/ui/FormField';
import { BRA_BANDS, BRA_CUPS, braSize, braTypicalBust, formatRange } from '@/lib/products/size-chart';

const MIN_CM = 50;
const MAX_CM = 160;

function parseCm(raw: string): { value: number | null; error?: string } {
  const text = raw.trim().replace(',', '.');
  if (!text) return { value: null };
  const value = Number(text);
  if (!Number.isFinite(value)) return { value: null, error: 'Yalnız rakam girin.' };
  if (value < MIN_CM || value > MAX_CM) return { value: null, error: `${MIN_CM}–${MAX_CM} cm arasında bir değer girin.` };
  return { value };
}

/** Sütyen ölçüsü: band from the underbust, cup from the difference to the bust. */
export default function BraFinder() {
  const [underbustRaw, setUnderbustRaw] = useState('');
  const [bustRaw, setBustRaw] = useState('');

  const underbust = parseCm(underbustRaw);
  const bust = parseCm(bustRaw);
  const bustError = bust.error ?? (bust.value !== null && underbust.value !== null && bust.value <= underbust.value ? 'Göğüs ölçüsü göğüs altından büyük olmalı.' : undefined);

  const result = useMemo(
    () => (underbust.value !== null && bust.value !== null && !bustError ? braSize(underbust.value, bust.value) : null),
    [underbust.value, bust.value, bustError],
  );
  const size = result?.kind === 'size' ? result : null;

  return (
    <section id="sutyen-olcusu" className="guide-section" aria-labelledby="bra-title">
      <div className="guide-section__head">
        <p className="guide-section__num" aria-hidden="true">03</p>
        <h2 id="bra-title" className="guide-section__title">Sütyen ölçüsü</h2>
        <p className="guide-section__text">
          Bant ölçüsü göğüs altından, kup ölçüsü göğüs ile göğüs altı arasındaki farktan gelir. Kup ölçünü bilmek kesim ve dolgu seçimini kolaylaştırır.
        </p>
      </div>

      <div className="guide-section__body">
        <div className="size-finder">
          <form className="size-finder__form" onSubmit={(event) => event.preventDefault()} noValidate>
            <FormField id="bra-underbust" label="Göğüs altı çevresi (cm)" hint="Göğsün hemen altından, mezurayı sıkıca sararak." error={underbust.error}>
              <input type="text" inputMode="decimal" autoComplete="off" placeholder="örn. 75" value={underbustRaw} onChange={(event) => setUnderbustRaw(event.target.value)} />
            </FormField>
            <FormField id="bra-bust" label="Göğüs çevresi (cm)" hint="En dolgun noktadan, mezurayı sıkmadan." error={bustError}>
              <input type="text" inputMode="decimal" autoComplete="off" placeholder="örn. 89" value={bustRaw} onChange={(event) => setBustRaw(event.target.value)} />
            </FormField>
          </form>

          <div className={`size-result${size ? ' has-result' : ''}`} aria-live="polite">
            <p className="size-result__label">Sütyen bedenin</p>
            {size ? (
              <>
                <p className="size-result__size" key={`${size.band}${size.cup}`}>
                  {size.band}{size.cup}
                  <span className="size-result__tr">TR / EU</span>
                </p>
                <dl className="size-result__breakdown">
                  <div><dt>Bant</dt><dd>{size.band}</dd></div>
                  <div><dt>Kup</dt><dd>{size.cup}</dd></div>
                  <div><dt>Fark</dt><dd>{size.difference} cm</dd></div>
                </dl>
                <p className="size-result__note">Sütyenlerimiz S–XL bedenlerde; harf bedenini yukarıdaki göğüs ölçüsüyle seç, kup ölçünü kesim seçerken kullan.</p>
                <Link href="/sutyen" className="btn btn--primary btn--block">Sütyenlere göz at</Link>
              </>
            ) : result?.kind === 'out-of-range' ? (
              <>
                <p className="size-result__placeholder" aria-hidden="true">—</p>
                <p className="size-result__note">
                  {result.reason === 'band'
                    ? 'Göğüs altı ölçün tablonun dışında.'
                    : `Ölçüler arasındaki fark (${result.difference} cm) tablodaki kupların dışında.`}{' '}
                  Ölçüyü tekrar al ya da <Link href="/iletisim">bize yaz</Link>; birlikte bakalım.
                </p>
              </>
            ) : (
              <>
                <p className="size-result__placeholder" aria-hidden="true">—</p>
                <p className="size-result__empty">İki ölçüyü de girdiğinde bant ve kup burada görünür.</p>
              </>
            )}
          </div>
        </div>

        <div className="size-chart-wrap">
          <table className="size-chart size-chart--bra">
            <caption className="size-chart__caption">Sütyen tablosu (TR / EU): hücrelerde tipik göğüs çevresi, santimetre</caption>
            <thead>
              <tr>
                <th scope="col">Bant</th>
                <th scope="col">Göğüs altı <span className="size-chart__unit">cm</span></th>
                {BRA_CUPS.map((cup) => (
                  <th key={cup.cup} scope="col">{cup.cup}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRA_BANDS.map((band) => {
                const isRow = size?.band === band.band;
                return (
                  <tr key={band.band} className={isRow ? 'is-highlighted' : undefined}>
                    <th scope="row">{band.band}</th>
                    <td>{formatRange(band.underbust)}</td>
                    {BRA_CUPS.map((cup) => {
                      const isCell = isRow && size?.cup === cup.cup;
                      return (
                        <td key={cup.cup} className={isCell ? 'is-match' : undefined} aria-current={isCell ? 'true' : undefined}>
                          {braTypicalBust(band, cup)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
