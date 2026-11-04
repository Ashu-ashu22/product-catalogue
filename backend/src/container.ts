import { SmtpEnquiryNotifier } from './adapters/email/SmtpEnquiryNotifier.js';
import { FakeStoreProductRepository } from './adapters/fakestore/FakeStoreProductRepository.js';
import { ConfigMerchandisingSource } from './adapters/merchandising/ConfigMerchandisingSource.js';
import type { Config } from './config.js';
import { createApp } from './http/app.js';
import { CatalogueService } from './services/CatalogueService.js';
import { EnquiryService } from './services/EnquiryService.js';

/**
 * Composition root: the ONE place that decides which adapters are used.
 * Swapping the product source or email provider is a change to this file
 * (plus the new adapter) — nothing else.
 */
export function buildApp(config: Config) {
  const products = new FakeStoreProductRepository({
    baseUrl: config.PRODUCT_SOURCE_URL,
    cacheTtlMs: config.PRODUCT_CACHE_TTL_SECONDS * 1000,
    timeoutMs: config.PRODUCT_SOURCE_TIMEOUT_MS,
  });
  const merchandising = new ConfigMerchandisingSource(config.FEATURED_PRODUCT_IDS);
  const notifier = new SmtpEnquiryNotifier({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
    from: config.MAIL_FROM,
    salesInbox: config.SALES_INBOX,
  });

  return createApp({
    catalogue: new CatalogueService(products, merchandising, {
      topRatedPerCategory: config.TOP_RATED_PER_CATEGORY,
    }),
    enquiries: new EnquiryService(products, notifier),
    corsOrigins: config.CORS_ORIGINS,
    enquiryRateLimitPerMinute: config.ENQUIRY_RATE_LIMIT_PER_MINUTE,
  });
}
