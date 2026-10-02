import React from 'react';
import { formatRange, MEASURE_LABELS, SIZE_CHART, type Measure } from '@/lib/products/size-chart';

const MEASURES = Object.keys(MEASURE_LABELS) as Measure[];

/** Türkiye beden tablosu. `highlight` marks the recommended row from the calculator. */
export default function SizeChartTable({ highlight, caption }: { highlight?: string | null; caption?: string }) {
  return (
    <table className="size-chart">
      {caption ? <caption className="size-chart__caption">{caption}</caption> : null}
      <thead>
        <tr>
          <th scope="col">Beden</th>
          <th scope="col">TR</th>
          {MEASURES.map((measure) => (
            <th key={measure} scope="col">
              {MEASURE_LABELS[measure]} <span className="size-chart__unit">cm</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SIZE_CHART.map((row) => {
          const isHighlighted = highlight === row.size;
          return (
            <tr key={row.size} className={isHighlighted ? 'is-highlighted' : undefined} aria-current={isHighlighted ? 'true' : undefined}>
              <th scope="row">{row.size}</th>
              <td>{row.tr}</td>
              {MEASURES.map((measure) => (
                <td key={measure}>{formatRange(row[measure])}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
