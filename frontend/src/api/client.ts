import type { Category, CategoryPage, EnquiryRequest, Product } from './types';

/** An error from our API, carrying the server's message and field errors. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, code: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * The ONLY module that knows URLs. The client never talks to the product
 * source directly — everything goes through our backend at /api.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const err = body?.error ?? {};
    throw new ApiError(
      err.message ?? 'Something went wrong. Please try again.',
      response.status,
      err.code ?? 'UNKNOWN',
      err.fields,
    );
  }
  return body as T;
}

export const api = {
  getFeatured: (signal?: AbortSignal) =>
    request<{ products: Product[] }>('/featured', { signal }).then((r) => r.products),

  getCategories: (signal?: AbortSignal) =>
    request<{ categories: Category[] }>('/categories', { signal }).then((r) => r.categories),

  getCategoryPage: (slug: string, signal?: AbortSignal) =>
    request<CategoryPage>(`/categories/${encodeURIComponent(slug)}`, { signal }),

  search: (term: string, signal?: AbortSignal) =>
    request<{ products: Product[] }>(`/search?q=${encodeURIComponent(term)}`, { signal }).then(
      (r) => r.products,
    ),

  getProduct: (id: string, signal?: AbortSignal) =>
    request<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { signal }).then(
      (r) => r.product,
    ),

  sendEnquiry: (productId: string, enquiry: EnquiryRequest) =>
    request<{ status: 'received' }>(`/products/${encodeURIComponent(productId)}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry),
    }),
};

export type Api = typeof api;
