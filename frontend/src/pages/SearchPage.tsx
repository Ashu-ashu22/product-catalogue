import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { AsyncContent } from '../components/Status';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * The search term lives in the URL (?q=) so results are shareable,
 * bookmarkable and work with the back button.
 */
export function SearchPage() {
  const [params] = useSearchParams();
  const term = (params.get('q') ?? '').trim();
  useDocumentTitle(term ? `Search: ${term}` : 'Search');

  if (!term) {
    return (
      <>
        <h1>Search</h1>
        <p className="status">Enter a search term above to find products.</p>
      </>
    );
  }
  return <SearchResults term={term} />;
}

function SearchResults({ term }: { term: string }) {
  const state = useAsync((signal) => api.search(term, signal), [term]);

  return (
    <>
      <h1>Results for “{term}”</h1>
      <AsyncContent state={state}>
        {(products) =>
          products.length > 0 ? (
            <>
              <p className="status" role="status">
                {products.length} {products.length === 1 ? 'product' : 'products'} found
              </p>
              <ProductGrid products={products} label="Search results" />
            </>
          ) : (
            <p className="status" role="status">
              No products match “{term}”. Try a different word.
            </p>
          )
        }
      </AsyncContent>
    </>
  );
}
