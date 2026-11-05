import { Link } from 'react-router-dom';
import type { Product } from '../api/types';
import { Price } from './Price';
import { Rating } from './Rating';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link to={`/products/${encodeURIComponent(product.id)}`} className="product-card__link">
        <div className="product-card__media">
          <img src={product.imageUrl} alt="" loading="lazy" />
        </div>
        <div className="product-card__body">
          <p className="product-card__category">{product.category.name}</p>
          <h3 className="product-card__title">{product.title}</h3>
          <div className="product-card__meta">
            <Price value={product.price} />
            <Rating value={product.rating} compact />
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul className="product-grid" aria-label={label}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
