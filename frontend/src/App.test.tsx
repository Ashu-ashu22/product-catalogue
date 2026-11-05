import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api/client';
import { featured, makeProduct } from './test/fixtures';
import { renderApp } from './test/renderApp';

/**
 * Critical-path tests, one block per acceptance criterion. The whole app is
 * rendered with real routing; only the API client is mocked.
 */
vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>();
  return {
    ...actual,
    api: {
      getFeatured: vi.fn(),
      getCategories: vi.fn(),
      getCategoryPage: vi.fn(),
      search: vi.fn(),
      getProduct: vi.fn(),
      sendEnquiry: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api);
const jacket = makeProduct({ id: '3', title: 'Mens Cotton Jacket', rating: { average: 4.7, count: 500 } });

beforeEach(() => {
  mockedApi.getFeatured.mockResolvedValue(featured);
  mockedApi.getCategories.mockResolvedValue([
    { slug: 'electronics', name: 'Electronics' },
    { slug: 'mens-clothing', name: "Men's clothing" },
  ]);
  mockedApi.getProduct.mockResolvedValue(jacket);
});

describe('Home page', () => {
  it('shows the 5 featured products', async () => {
    renderApp('/');
    const grid = await screen.findByRole('list', { name: 'Top rated products' });
    const tiles = within(grid).getAllByRole('link');
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toHaveTextContent('Fjallraven Backpack');
    expect(tiles[0]).toHaveTextContent('$109.95');
  });

  it('shows a friendly error if the API is unavailable', async () => {
    mockedApi.getFeatured.mockRejectedValue(
      new ApiError('A service we depend on is unavailable.', 502, 'UPSTREAM_ERROR'),
    );
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('A service we depend on is unavailable.');
  });
});

describe('Category page', () => {
  it('opens from a category link and shows top rated plus additional products', async () => {
    mockedApi.getCategoryPage.mockResolvedValue({
      category: { slug: 'mens-clothing', name: "Men's clothing" },
      topRated: [jacket],
      others: [makeProduct({ id: '4', title: 'Mens Casual Slim Fit' })],
    });
    const { user } = renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await user.click(within(nav).getByRole('link', { name: "Men's clothing" }));

    expect(await screen.findByRole('heading', { level: 1, name: "Men's clothing" })).toBeInTheDocument();
    expect(mockedApi.getCategoryPage).toHaveBeenCalledWith('mens-clothing', expect.any(AbortSignal));
    expect(within(screen.getByRole('list', { name: "Top rated in Men's clothing" })).getByText('Mens Cotton Jacket')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: "More in Men's clothing" })).getByText('Mens Casual Slim Fit')).toBeInTheDocument();
  });
});

describe('Search', () => {
  it('searches when the search button is clicked and shows only the results', async () => {
    mockedApi.search.mockResolvedValue([jacket]);
    const { user } = renderApp('/');
    await screen.findByRole('list', { name: 'Top rated products' });

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  jacket ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Results for “jacket”' })).toBeInTheDocument();
    expect(mockedApi.search).toHaveBeenCalledWith('jacket', expect.any(AbortSignal));
    const results = within(screen.getByRole('list', { name: 'Search results' })).getAllByRole('link');
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveTextContent('Mens Cotton Jacket');
    // The featured list is gone: only matching products are shown.
    expect(screen.queryByRole('list', { name: 'Top rated products' })).not.toBeInTheDocument();
  });

  it('tells the user when nothing matches', async () => {
    mockedApi.search.mockResolvedValue([]);
    renderApp('/search?q=unicorn');
    expect(await screen.findByText(/No products match “unicorn”/)).toBeInTheDocument();
  });

  it('does not search for a blank term', async () => {
    const { user } = renderApp('/');
    await user.type(screen.getByRole('searchbox'), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(mockedApi.search).not.toHaveBeenCalled();
  });
});

describe('Product page', () => {
  it('opens the details page when a product tile is clicked', async () => {
    mockedApi.getProduct.mockResolvedValue(featured[0]!);
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: /Fjallraven Backpack/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Fjallraven Backpack' })).toBeInTheDocument();
    expect(mockedApi.getProduct).toHaveBeenCalledWith('1', expect.any(AbortSignal));
    expect(screen.getByText('Your perfect pack for everyday use.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enquire' })).toHaveAttribute('href', '/products/1/enquire');
  });

  it('shows the API message for an unknown product', async () => {
    mockedApi.getProduct.mockRejectedValue(new ApiError('Product "999" not found', 404, 'NOT_FOUND'));
    renderApp('/products/999');
    expect(await screen.findByRole('alert')).toHaveTextContent('Product "999" not found');
  });
});

describe('Enquiry', () => {
  async function openForm() {
    const utils = renderApp('/products/3');
    await utils.user.click(await screen.findByRole('link', { name: 'Enquire' }));
    await screen.findByRole('heading', { name: 'Enquire about Mens Cotton Jacket' });
    return utils;
  }

  it('submits contact details and shows a thank you message', async () => {
    mockedApi.sendEnquiry.mockResolvedValue({ status: 'received' });
    const { user } = await openForm();

    await user.type(screen.getByLabelText('Name *'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
    await user.type(screen.getByLabelText('Phone (optional)'), '+44 20 7946 0958');
    await user.type(screen.getByLabelText('Message (optional)'), 'Do you ship to London?');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toHaveFocus();
    expect(mockedApi.sendEnquiry).toHaveBeenCalledWith('3', {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 20 7946 0958',
      message: 'Do you ship to London?',
      website: '',
    });
  });

  it('validates required fields before calling the API', async () => {
    const { user } = await openForm();
    await user.type(screen.getByLabelText('Email *'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toHaveAttribute('aria-invalid', 'true');
    expect(mockedApi.sendEnquiry).not.toHaveBeenCalled();
  });

  it('shows server-side field errors', async () => {
    mockedApi.sendEnquiry.mockRejectedValue(
      new ApiError('Please check the highlighted fields', 400, 'VALIDATION_ERROR', {
        phone: 'Enter a valid phone number',
      }),
    );
    const { user } = await openForm();
    await user.type(screen.getByLabelText('Name *'), 'Ada');
    await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
    await user.type(screen.getByLabelText('Phone (optional)'), 'call me');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
  });

  it('keeps the form filled in and explains when sending fails', async () => {
    mockedApi.sendEnquiry.mockRejectedValue(
      new ApiError('A service we depend on is unavailable. Please try again shortly.', 502, 'UPSTREAM_ERROR'),
    );
    const { user } = await openForm();
    await user.type(screen.getByLabelText('Name *'), 'Ada');
    await user.type(screen.getByLabelText('Email *'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Please try again shortly'));
    expect(screen.getByLabelText('Name *')).toHaveValue('Ada');
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeEnabled();
  });
});
