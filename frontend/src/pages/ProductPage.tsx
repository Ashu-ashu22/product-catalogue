import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Price } from '../components/Price';
import { Rating } from '../components/Rating';
import { AsyncContent } from '../components/Status';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function ProductPage() {
  const { id = '' } = useParams();
  const state = useAsync((signal) => api.getProduct(id, signal), [id]);
  useDocumentTitle(state.status === 'success' ? state.data.title : undefined);

  return (
    <AsyncContent state={state}>
      {(product) => (
        <article className="product-detail">
          <div className="product-detail__media">
            <img src={product.imageUrl} alt={product.title} />
          </div>
          <div className="product-detail__info">
            <Link to={`/categories/${product.category.slug}`} className="product-detail__category">
              {product.category.name}
            </Link>
            <h1>{product.title}</h1>
            <Rating value={product.rating} />
            <p className="product-detail__price">
              <Price value={product.price} />
            </p>
            <p className="product-detail__description">{product.description}</p>
            <Link to={`/products/${encodeURIComponent(product.id)}/enquire`} className="button button--large">
              Enquire
            </Link>
          </div>
        </article>
      )}
    </AsyncContent>
  );
}
