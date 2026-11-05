/**
 * Domain model for the catalogue.
 *
 * These types are deliberately our own and NOT the Fake Store API shape.
 * Every product source adapter maps its data into these types, so the rest of
 * the backend (and the frontend contract) never changes when the source does.
 */

export interface Money {
  /** Amount in minor-unit-free decimal form, e.g. 109.95 */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
}

export interface Rating {
  /** Average rating, 0–5 */
  average: number;
  /** Number of ratings */
  count: number;
}

export interface Category {
  /** URL-safe identifier, e.g. "mens-clothing" */
  slug: string;
  /** Human-readable name, e.g. "Men's clothing" */
  name: string;
}

export interface Product {
  /** Opaque identifier. A string so future sources (UUIDs, SKUs) fit. */
  id: string;
  title: string;
  description: string;
  price: Money;
  category: Category;
  imageUrl: string;
  rating: Rating;
}
