import type { Product } from '../api/types';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    title: 'Fjallraven Backpack',
    description: 'Your perfect pack for everyday use.',
    price: { amount: 109.95, currency: 'USD' },
    category: { slug: 'mens-clothing', name: "Men's clothing" },
    imageUrl: 'https://example.test/backpack.jpg',
    rating: { average: 3.9, count: 120 },
    ...overrides,
  };
}

export const featured: Product[] = [
  makeProduct({ id: '1', title: 'Fjallraven Backpack' }),
  makeProduct({ id: '5', title: 'Dragon Bracelet', category: { slug: 'jewelery', name: 'Jewelery' } }),
  makeProduct({ id: '9', title: 'WD 2TB Hard Drive', category: { slug: 'electronics', name: 'Electronics' } }),
  makeProduct({ id: '13', title: 'Acer Monitor', category: { slug: 'electronics', name: 'Electronics' } }),
  makeProduct({ id: '18', title: "MBJ Women's Top", category: { slug: 'womens-clothing', name: "Women's clothing" } }),
];
