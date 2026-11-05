import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

function respond(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('calls our backend (never the product source) and unwraps the payload', async () => {
    const fetchSpy = respond({ products: [] });
    await expect(api.search('red shoes')).resolves.toEqual([]);
    expect(fetchSpy).toHaveBeenCalledWith('/api/search?q=red%20shoes', expect.anything());
  });

  it('posts enquiries as JSON to the product enquiry endpoint', async () => {
    const fetchSpy = respond({ status: 'received' }, 202);
    await api.sendEnquiry('3', { name: 'Ada', email: 'ada@example.com' });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/products/3/enquiries');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('turns an API error body into an ApiError with field errors', async () => {
    respond(
      { error: { code: 'VALIDATION_ERROR', message: 'Check fields', fields: { email: 'Bad email' } } },
      400,
    );
    const error = await api.sendEnquiry('3', { name: 'A', email: 'x' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: { email: 'Bad email' } });
  });

  it('reports network failures in plain language', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.getFeatured()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
