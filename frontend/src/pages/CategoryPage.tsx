import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { AsyncContent } from '../components/Status';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const state = useAsync((signal) => api.getCategoryPage(slug, signal), [slug]);
  useDocumentTitle(state.status === 'success' ? state.data.category.name : undefined);

  return (
    <AsyncContent state={state}>
      {({ category, topRated, others }) => (
        <>
          <h1>{category.name}</h1>
          <section aria-labelledby="top-rated-heading">
            <h2 id="top-rated-heading">Top rated in {category.name}</h2>
            <ProductGrid products={topRated} label={`Top rated in ${category.name}`} />
          </section>
          {others.length > 0 && (
            <section aria-labelledby="more-heading">
              <h2 id="more-heading">More in {category.name}</h2>
              <ProductGrid products={others} label={`More in ${category.name}`} />
            </section>
          )}
        </>
      )}
    </AsyncContent>
  );
}
