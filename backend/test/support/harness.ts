import { vi } from 'vitest';
import { FakeStoreProductRepository } from '../../src/adapters/fakestore/FakeStoreProductRepository.js';
import { ConfigMerchandisingSource } from '../../src/adapters/merchandising/ConfigMerchandisingSource.js';
import type { Enquiry, EnquiryNotifier } from '../../src/domain/ports.js';
import { createApp } from '../../src/http/app.js';
import { CatalogueService } from '../../src/services/CatalogueService.js';
import { EnquiryService } from '../../src/services/EnquiryService.js';
import { fakeStoreProducts } from '../fixtures/fakeStoreProducts.js';

/** Records enquiries instead of sending email. */
export class RecordingNotifier implements EnquiryNotifier {
  readonly sent: Enquiry[] = [];
  failWith: Error | null = null;

  async notify(enquiry: Enquiry): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(enquiry);
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Builds the REAL app (routes, services, Fake Store adapter, validation) with
 * only the network edges replaced: `fetch` is stubbed and email is recorded.
 */
export function createTestApp(
  overrides: {
    fetchFn?: typeof fetch;
    featuredIds?: string[];
    enquiryRateLimitPerMinute?: number;
  } = {},
) {
  const fetchFn =
    overrides.fetchFn ?? vi.fn(async () => jsonResponse(fakeStoreProducts));
  const products = new FakeStoreProductRepository({
    baseUrl: 'https://fakestore.test',
    cacheTtlMs: 60_000,
    timeoutMs: 1_000,
    fetchFn: fetchFn as typeof fetch,
  });
  const notifier = new RecordingNotifier();
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };

  const app = createApp({
    catalogue: new CatalogueService(
      products,
      new ConfigMerchandisingSource(overrides.featuredIds ?? ['1', '5', '9', '13', '18']),
      { topRatedPerCategory: 3 },
      logger,
    ),
    enquiries: new EnquiryService(products, notifier, () => new Date('2026-11-04T10:00:00Z')),
    corsOrigins: [],
    enquiryRateLimitPerMinute: overrides.enquiryRateLimitPerMinute ?? 100,
    logger,
  });

  return { app, notifier, fetchFn, logger };
}
