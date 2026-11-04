import { z } from 'zod';
import { UpstreamError } from '../../domain/errors.js';
import type { ProductRepository } from '../../domain/ports.js';
import type { Category, Product } from '../../domain/product.js';
import { matchesSearch } from '../../domain/search.js';
import { fakeStoreProductSchema, toProduct } from './mapper.js';

export interface FakeStoreOptions {
  baseUrl: string;
  /** How long the product list is cached in memory. 0 disables caching. */
  cacheTtlMs: number;
  /** Per-request timeout for upstream calls. */
  timeoutMs: number;
  /** Injected for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Injected for tests; defaults to Date.now. */
  now?: () => number;
  logger?: Pick<Console, 'warn'>;
}

/**
 * ProductRepository backed by https://fakestoreapi.com.
 *
 * The whole catalogue is ~20 products, so we fetch `/products` once, cache it,
 * and answer every query from memory. This also avoids Fake Store quirks
 * (e.g. `/products/:id` returns 200 with an empty body for unknown ids).
 * A real source with thousands of products would push filtering and search
 * down to the source instead — the ProductRepository port allows that.
 */
export class FakeStoreProductRepository implements ProductRepository {
  private cache: { products: Product[]; expiresAt: number } | null = null;
  private inFlight: Promise<Product[]> | null = null;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly logger: Pick<Console, 'warn'>;

  constructor(private readonly options: FakeStoreOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
    this.logger = options.logger ?? console;
  }

  async listAll(): Promise<Product[]> {
    if (this.cache && this.cache.expiresAt > this.now()) {
      return this.cache.products;
    }
    // Collapse concurrent cache misses into a single upstream request.
    this.inFlight ??= this.fetchProducts().finally(() => {
      this.inFlight = null;
    });
    try {
      const products = await this.inFlight;
      this.cache = { products, expiresAt: this.now() + this.options.cacheTtlMs };
      return products;
    } catch (error) {
      // Serve stale data rather than an error page if we have any: a slightly
      // out-of-date catalogue beats a broken one.
      if (this.cache) {
        this.logger.warn('Product source failed; serving stale catalogue', error);
        return this.cache.products;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Product | null> {
    return (await this.listAll()).find((p) => p.id === id) ?? null;
  }

  async listCategories(): Promise<Category[]> {
    const bySlug = new Map<string, Category>();
    for (const p of await this.listAll()) bySlug.set(p.category.slug, p.category);
    return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByCategory(categorySlug: string): Promise<Product[]> {
    return (await this.listAll()).filter((p) => p.category.slug === categorySlug);
  }

  async search(term: string): Promise<Product[]> {
    return (await this.listAll()).filter((p) => matchesSearch(p, term));
  }

  private async fetchProducts(): Promise<Product[]> {
    const url = new URL('/products', this.options.baseUrl);
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (cause) {
      throw new UpstreamError('Product source is unreachable', { cause });
    }
    if (!response.ok) {
      throw new UpstreamError(`Product source responded with HTTP ${response.status}`);
    }

    const parsed = z.array(fakeStoreProductSchema).safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new UpstreamError('Product source returned an unexpected payload', {
        cause: parsed.error,
      });
    }
    return parsed.data.map(toProduct);
  }
}
