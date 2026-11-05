import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { CatalogueService } from '../services/CatalogueService.js';
import type { EnquiryService } from '../services/EnquiryService.js';
import { createErrorHandler, notFoundHandler } from './errorHandler.js';
import { categorySlugParam, enquiryBody, productIdParam, searchQuery } from './schemas.js';

export interface AppDependencies {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  corsOrigins: string[];
  enquiryRateLimitPerMinute: number;
  logger?: Pick<Console, 'error' | 'warn' | 'info'>;
}

/**
 * Builds the Express app from injected services. No I/O happens here, which
 * is what lets the tests run the real HTTP layer against fake adapters.
 */
export function createApp(deps: AppDependencies): Express {
  const { catalogue, enquiries, logger = console } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind nginx / a load balancer: real client IP for rate limiting
  app.use(helmet());
  app.use(cors({ origin: deps.corsOrigins.length > 0 ? deps.corsOrigins : false }));
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();

  // Product data changes rarely; let browsers/CDNs cache briefly.
  const cacheable: express.RequestHandler = (_req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60');
    next();
  };

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  api.get('/featured', cacheable, async (_req, res) => {
    res.json({ products: await catalogue.getFeatured() });
  });

  api.get('/categories', cacheable, async (_req, res) => {
    res.json({ categories: await catalogue.listCategories() });
  });

  api.get('/categories/:slug', cacheable, async (req, res) => {
    const { slug } = categorySlugParam.parse(req.params);
    res.json(await catalogue.getCategoryPage(slug));
  });

  api.get('/search', cacheable, async (req, res) => {
    const { q } = searchQuery.parse(req.query);
    res.json({ query: q, products: await catalogue.search(q) });
  });

  api.get('/products/:id', cacheable, async (req, res) => {
    const { id } = productIdParam.parse(req.params);
    res.json({ product: await catalogue.getProduct(id) });
  });

  const enquiryLimiter = rateLimit({
    windowMs: 60_000,
    limit: deps.enquiryRateLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again in a minute.' },
    },
  });

  api.post('/products/:id/enquiries', enquiryLimiter, async (req, res) => {
    const { id } = productIdParam.parse(req.params);
    const body = enquiryBody.parse(req.body);

    if (body.website) {
      logger.warn(`Honeypot triggered for product ${id}; enquiry dropped`);
    } else {
      await enquiries.submit({
        productId: id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
      });
    }
    res.status(202).json({ status: 'received' });
  });

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
