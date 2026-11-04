/**
 * The API contract as seen by the client. Mirrors the backend's domain model
 * (backend/src/domain/product.ts). Next step: generate these from an OpenAPI
 * spec so the two can't drift (see DECISIONS.md).
 */

export interface Money {
  amount: number;
  currency: string;
}

export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: Money;
  category: Category;
  imageUrl: string;
  rating: { average: number; count: number };
}

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface EnquiryRequest {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  /** Honeypot — always empty for real users. */
  website?: string;
}
