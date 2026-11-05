import type { Product } from '../api/types';

export function Rating({ value, compact = false }: { value: Product['rating']; compact?: boolean }) {
  const label = `Rated ${value.average.toFixed(1)} out of 5 from ${value.count} reviews`;
  return (
    <span className="rating" aria-label={label} title={label}>
      <span aria-hidden="true">★ {value.average.toFixed(1)}</span>
      {!compact && <span aria-hidden="true" className="rating__count"> ({value.count} reviews)</span>}
    </span>
  );
}
