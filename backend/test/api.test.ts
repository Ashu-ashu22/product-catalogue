import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createTestApp, jsonResponse } from './support/harness.js';

/**
 * End-to-end tests of the HTTP API, one block per acceptance criterion.
 * Real routes, validation, services and Fake Store adapter; only the network
 * (fetch) and email delivery are faked.
 */

describe('Home page: featured products', () => {
  it('returns the 5 hand-picked products in the chosen order', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/featured').expect(200);

    expect(res.body.products.map((p: { id: string }) => p.id)).toEqual(['1', '5', '9', '13', '18']);
    expect(res.body.products[0]).toMatchObject({
      title: 'Fjallraven Foldsack No. 1 Backpack',
      price: { amount: 109.95, currency: 'USD' },
      category: { slug: 'mens-clothing', name: "Men's clothing" },
      rating: { average: 3.9, count: 120 },
    });
  });

  it('skips (and logs) a featured id that no longer exists instead of failing the page', async () => {
    const { app, logger } = createTestApp({ featuredIds: ['1', '999', '5'] });
    const res = await request(app).get('/api/featured').expect(200);

    expect(res.body.products.map((p: { id: string }) => p.id)).toEqual(['1', '5']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('999'));
  });
});

describe('Category page', () => {
  it('lists categories with URL-safe slugs', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/categories').expect(200);

    expect(res.body.categories).toEqual([
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'jewelery', name: 'Jewelery' },
      { slug: 'mens-clothing', name: "Men's clothing" },
      { slug: 'womens-clothing', name: "Women's clothing" },
    ]);
  });

  it('splits a category into top rated products and additional products', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/categories/mens-clothing').expect(200);

    expect(res.body.category).toEqual({ slug: 'mens-clothing', name: "Men's clothing" });
    // 4.7, 4.1, 3.9 are the top 3 by rating; 2.1 is "additional".
    expect(res.body.topRated.map((p: { id: string }) => p.id)).toEqual(['3', '2', '1']);
    expect(res.body.others.map((p: { id: string }) => p.id)).toEqual(['4']);
  });

  it('returns 404 for an unknown category', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/categories/garden').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects a malformed category slug', async () => {
    const { app } = createTestApp();
    await request(app).get('/api/categories/BAD%20SLUG').expect(400);
  });
});

describe('Search', () => {
  it('returns only products whose text matches the term (case-insensitive)', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/search').query({ q: 'JACKET' }).expect(200);

    expect(res.body.query).toBe('JACKET');
    expect(res.body.products.map((p: { id: string }) => p.id)).toEqual(['3']);
  });

  it('matches against the description and category too', async () => {
    const { app } = createTestApp();
    const byDescription = await request(app).get('/api/search').query({ q: 'water dragon' });
    expect(byDescription.body.products.map((p: { id: string }) => p.id)).toEqual(['5']);

    const byCategory = await request(app).get('/api/search').query({ q: 'electronics' });
    expect(byCategory.body.products.map((p: { id: string }) => p.id)).toEqual(['9', '13']);
  });

  it('requires every word of a multi-word term to match', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/search').query({ q: 'slim shirts' });
    expect(res.body.products.map((p: { id: string }) => p.id)).toEqual(['2']);
  });

  it('returns an empty list when nothing matches', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/search').query({ q: 'unicorn' }).expect(200);
    expect(res.body.products).toEqual([]);
  });

  it.each([[''], ['   '], ['x'.repeat(101)]])('rejects an invalid term %#', async (q) => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/search').query({ q }).expect(400);
    expect(res.body.error.fields.q).toBeDefined();
  });

  it('rejects a missing term', async () => {
    const { app } = createTestApp();
    await request(app).get('/api/search').expect(400);
  });
});

describe('Product page', () => {
  it('returns product details', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/products/13').expect(200);
    expect(res.body.product).toMatchObject({ id: '13', category: { slug: 'electronics' } });
    expect(res.headers['cache-control']).toBe('public, max-age=60');
  });

  it('returns 404 for an unknown product', async () => {
    const { app } = createTestApp();
    await request(app).get('/api/products/999').expect(404);
  });

  it('rejects ids with unexpected characters', async () => {
    const { app } = createTestApp();
    await request(app).get('/api/products/..%2Fetc').expect(400);
  });
});

describe('Enquiry', () => {
  const valid = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 20 7946 0958',
    message: 'Do you ship to London?',
  };

  it('emails the sales inbox and acknowledges the customer', async () => {
    const { app, notifier } = createTestApp();
    const res = await request(app).post('/api/products/3/enquiries').send(valid).expect(202);

    expect(res.body).toEqual({ status: 'received' });
    expect(notifier.sent).toEqual([
      {
        // Product title comes from OUR data, not from the client.
        product: { id: '3', title: 'Mens Cotton Jacket' },
        customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+44 20 7946 0958' },
        message: 'Do you ship to London?',
        receivedAt: new Date('2026-11-04T10:00:00Z'),
      },
    ]);
  });

  it('accepts an enquiry without the optional phone and message', async () => {
    const { app, notifier } = createTestApp();
    await request(app)
      .post('/api/products/3/enquiries')
      .send({ name: 'Ada', email: 'ada@example.com', phone: '', message: '' })
      .expect(202);
    expect(notifier.sent[0]?.customer.phone).toBeUndefined();
    expect(notifier.sent[0]?.message).toBe('');
  });

  it('returns field-level errors and sends nothing when input is invalid', async () => {
    const { app, notifier } = createTestApp();
    const res = await request(app)
      .post('/api/products/3/enquiries')
      .send({ name: ' ', email: 'not-an-email', phone: 'call me' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'name', 'phone']);
    expect(notifier.sent).toHaveLength(0);
  });

  it('returns 404 for an enquiry about a product that does not exist', async () => {
    const { app, notifier } = createTestApp();
    await request(app).post('/api/products/999/enquiries').send(valid).expect(404);
    expect(notifier.sent).toHaveLength(0);
  });

  it('silently drops honeypot submissions from bots', async () => {
    const { app, notifier } = createTestApp();
    await request(app)
      .post('/api/products/3/enquiries')
      .send({ ...valid, website: 'http://spam.example' })
      .expect(202);
    expect(notifier.sent).toHaveLength(0);
  });

  it('returns 502 (not a fake "thank you") when the email cannot be sent', async () => {
    const { app, notifier } = createTestApp();
    const { UpstreamError } = await import('../src/domain/errors.js');
    notifier.failWith = new UpstreamError('SMTP down');

    const res = await request(app).post('/api/products/3/enquiries').send(valid).expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('SMTP');
  });

  it('rejects malformed JSON', async () => {
    const { app } = createTestApp();
    await request(app)
      .post('/api/products/3/enquiries')
      .set('Content-Type', 'application/json')
      .send('{"name":')
      .expect(400);
  });

  it('rate limits enquiries per client', async () => {
    const { app } = createTestApp({ enquiryRateLimitPerMinute: 2 });
    await request(app).post('/api/products/3/enquiries').send(valid).expect(202);
    await request(app).post('/api/products/3/enquiries').send(valid).expect(202);
    await request(app).post('/api/products/3/enquiries').send(valid).expect(429);
  });
});

describe('Product source failures', () => {
  it('returns 502 with a safe message when the product source is down', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ message: 'oops' }, 503));
    const { app } = createTestApp({ fetchFn: fetchFn as unknown as typeof fetch });

    const res = await request(app).get('/api/featured').expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('returns 404 JSON for unknown API routes', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
