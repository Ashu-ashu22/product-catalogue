import type { Category, Product } from './product.js';

/**
 * Port: where product data comes from.
 *
 * Today this is implemented by the Fake Store API adapter. Tomorrow it could be
 * a database, a headless commerce platform or a search engine — only a new
 * adapter is needed; services and HTTP routes stay the same.
 */
export interface ProductRepository {
  listAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  listByCategory(categorySlug: string): Promise<Product[]>;
  /**
   * Free-text search. Kept on the repository (not the service) so a future
   * source with native search (e.g. OpenSearch, Algolia) can do it properly.
   */
  search(term: string): Promise<Product[]>;
}

/**
 * Port: which products the business has hand-picked as "top rated".
 * Implemented from config today; could be a CMS or admin UI later.
 */
export interface MerchandisingSource {
  featuredProductIds(): Promise<string[]>;
}

export interface Enquiry {
  product: Pick<Product, 'id' | 'title'>;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  message: string;
  receivedAt: Date;
}

/**
 * Port: how the sales team is told about an enquiry.
 * SMTP today (Mailpit locally); could be SES, SendGrid, a CRM or a queue.
 */
export interface EnquiryNotifier {
  notify(enquiry: Enquiry): Promise<void>;
}
