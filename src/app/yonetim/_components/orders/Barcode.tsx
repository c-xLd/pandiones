import React from 'react';
import { code128Bars } from '@/lib/shipping/code128';

/** Code 128 barcode as crisp SVG (scales to the label width; shapes are not anti-aliased). */
export default function Barcode({ value, height = 60, label }: { value: string; height?: number; label: string }) {
  const { bars, width } = code128Bars(value);
  return (
    <svg className="ship-label__barcode" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label} shapeRendering="crispEdges">
      {bars.map(([x, w]) => (
        <rect key={x} x={x} y={0} width={w} height={height} />
      ))}
    </svg>
  );
}
