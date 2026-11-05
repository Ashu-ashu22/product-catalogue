import { z } from 'zod';
import type { Category, Product } from '../../domain/product.js';

/**
 * The Fake Store API response shape. Validated at the boundary so a change or
 * outage upstream fails loudly here instead of leaking `undefined` into the UI.
 */
export const fakeStoreProductSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.string().url(),
  rating: z
    .object({ rate: z.number(), count: z.number().int() })
    .optional()
    .default({ rate: 0, count: 0 }),
});

export type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toCategory(raw: string): Category {
  const trimmed = raw.trim();
  return {
    slug: slugify(trimmed),
    name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
  };
}

/** Fake Store has no currency; we assume USD (see DECISIONS.md). */
const FAKE_STORE_CURRENCY = 'USD';

export function toProduct(raw: FakeStoreProduct): Product {
  return {
    id: String(raw.id),
    title: raw.title.trim(),
    description: raw.description.trim(),
    price: { amount: raw.price, currency: FAKE_STORE_CURRENCY },
    category: toCategory(raw.category),
    imageUrl: raw.image,
    rating: { average: raw.rating.rate, count: raw.rating.count },
  };
}
