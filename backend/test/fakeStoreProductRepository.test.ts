import { describe, expect, it, vi } from 'vitest';
import { FakeStoreProductRepository } from '../src/adapters/fakestore/FakeStoreProductRepository.js';
import { UpstreamError } from '../src/domain/errors.js';
import { fakeStoreProducts } from './fixtures/fakeStoreProducts.js';
import { jsonResponse } from './support/harness.js';

function createRepo(fetchFn: typeof fetch, now = () => 0) {
  return new FakeStoreProductRepository({
    baseUrl: 'https://fakestore.test',
    cacheTtlMs: 1_000,
    timeoutMs: 500,
    fetchFn,
    now,
  });
}

describe('FakeStoreProductRepository', () => {
  it('maps the Fake Store shape into the domain model', async () => {
    const repo = createRepo(vi.fn(async () => jsonResponse(fakeStoreProducts)) as unknown as typeof fetch);
    const product = await repo.findById('18');

    expect(product).toEqual({
      id: '18',
      title: "MBJ Women's Solid Short Sleeve Boat Neck V",
      description: '95% Rayon 5% Spandex, Made in USA or Imported.',
      price: { amount: 9.85, currency: 'USD' },
      category: { slug: 'womens-clothing', name: "Women's clothing" },
      imageUrl: 'https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_.jpg',
      rating: { average: 4.7, count: 130 },
    });
  });

  it('caches the catalogue and refetches after the TTL expires', async () => {
    let clock = 0;
    const fetchFn = vi.fn(async () => jsonResponse(fakeStoreProducts));
    const repo = createRepo(fetchFn as unknown as typeof fetch, () => clock);

    await repo.listAll();
    await repo.findById('1');
    await repo.listCategories();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    clock = 1_001;
    await repo.listAll();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent cache misses into one upstream request', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(fakeStoreProducts));
    const repo = createRepo(fetchFn as unknown as typeof fetch);

    await Promise.all([repo.listAll(), repo.search('mens'), repo.findById('3')]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse(fakeStoreProducts));
    const repo = createRepo(fetchFn as unknown as typeof fetch);

    await expect(repo.listAll()).rejects.toBeInstanceOf(UpstreamError);
    await expect(repo.listAll()).resolves.toHaveLength(fakeStoreProducts.length);
  });

  it('serves the stale catalogue if a refresh fails after the TTL', async () => {
    let clock = 0;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(fakeStoreProducts))
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    const logger = { warn: vi.fn() };
    const repo = new FakeStoreProductRepository({
      baseUrl: 'https://fakestore.test',
      cacheTtlMs: 1_000,
      timeoutMs: 500,
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => clock,
      logger,
    });

    await repo.listAll();
    clock = 5_000;
    await expect(repo.listAll()).resolves.toHaveLength(fakeStoreProducts.length);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('throws UpstreamError on a non-2xx response', async () => {
    const repo = createRepo(vi.fn(async () => jsonResponse({}, 500)) as unknown as typeof fetch);
    await expect(repo.listAll()).rejects.toThrow('HTTP 500');
  });

  it('throws UpstreamError when the payload shape is unexpected', async () => {
    const repo = createRepo(
      vi.fn(async () => jsonResponse([{ id: 'not-a-number' }])) as unknown as typeof fetch,
    );
    await expect(repo.listAll()).rejects.toThrow('unexpected payload');
  });
});
