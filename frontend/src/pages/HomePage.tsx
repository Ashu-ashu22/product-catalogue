import { api } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { AsyncContent } from '../components/Status';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function HomePage() {
  useDocumentTitle();
  const featured = useAsync((signal) => api.getFeatured(signal), []);

  return (
    <>
      <section className="hero">
        <h1>Find something you'll love</h1>
        <p>Browse our range and send us an enquiry — our team will get back to you.</p>
      </section>
      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading">Top rated</h2>
        <AsyncContent state={featured}>
          {(products) =>
            products.length > 0 ? (
              <ProductGrid products={products} label="Top rated products" />
            ) : (
              <p className="status">No featured products right now.</p>
            )
          }
        </AsyncContent>
      </section>
    </>
  );
}
