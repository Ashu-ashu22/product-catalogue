import type { Money } from '../api/types';

function formatPrice({ amount, currency }: Money, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function Price({ value }: { value: Money }) {
  return <span className="price">{formatPrice(value)}</span>;
}
