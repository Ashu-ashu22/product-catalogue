import type { Product } from './product.js';

/** Split a search term into lowercase words, ignoring extra whitespace. */
export function tokenize(term: string): string[] {
  return term.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * A product matches when EVERY word of the term appears (case-insensitive)
 * somewhere in its title, description or category name.
 * See DECISIONS.md for why this rule was chosen.
 */
export function matchesSearch(product: Product, term: string): boolean {
  const words = tokenize(term);
  if (words.length === 0) return false;
  const haystack = [product.title, product.description, product.category.name]
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}
