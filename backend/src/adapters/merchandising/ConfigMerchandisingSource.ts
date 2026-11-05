import type { MerchandisingSource } from '../../domain/ports.js';

/**
 * Featured ("top rated") products chosen by the business, read from config
 * (FEATURED_PRODUCT_IDS). Swappable for a CMS or admin screen later.
 */
export class ConfigMerchandisingSource implements MerchandisingSource {
  constructor(private readonly ids: readonly string[]) {}

  async featuredProductIds(): Promise<string[]> {
    return [...this.ids];
  }
}
