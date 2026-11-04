import { NotFoundError } from '../domain/errors.js';
import type { MerchandisingSource, ProductRepository } from '../domain/ports.js';
import type { Category, Product } from '../domain/product.js';

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  others: Product[];
}

/** Highest average first; ties broken by number of ratings (more = more trustworthy). */
export function byRatingDesc(a: Product, b: Product): number {
  return b.rating.average - a.rating.average || b.rating.count - a.rating.count;
}

/**
 * Business rules for browsing. Knows nothing about HTTP or about where
 * products come from — it only talks to ports.
 */
export class CatalogueService {
  constructor(
    private readonly products: ProductRepository,
    private readonly merchandising: MerchandisingSource,
    private readonly options: { topRatedPerCategory: number },
    private readonly logger: Pick<Console, 'warn'> = console,
  ) {}

  /** The hand-picked featured products, in the order the business chose. */
  async getFeatured(): Promise<Product[]> {
    const ids = await this.merchandising.featuredProductIds();
    const found = await Promise.all(ids.map((id) => this.products.findById(id)));
    const missing = ids.filter((_, i) => !found[i]);
    if (missing.length > 0) {
      // Don't break the home page because one curated product was removed.
      this.logger.warn(`Featured product ids not found in source: ${missing.join(', ')}`);
    }
    return found.filter((p): p is Product => p !== null);
  }

  listCategories(): Promise<Category[]> {
    return this.products.listCategories();
  }

  async getCategoryPage(slug: string): Promise<CategoryPage> {
    const category = (await this.products.listCategories()).find((c) => c.slug === slug);
    if (!category) throw new NotFoundError(`Category "${slug}" not found`);

    const ranked = [...(await this.products.listByCategory(slug))].sort(byRatingDesc);
    return {
      category,
      topRated: ranked.slice(0, this.options.topRatedPerCategory),
      others: ranked.slice(this.options.topRatedPerCategory),
    };
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundError(`Product "${id}" not found`);
    return product;
  }

  search(term: string): Promise<Product[]> {
    return this.products.search(term.trim());
  }
}
