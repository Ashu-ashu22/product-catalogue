import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { EnquiryPage } from './pages/EnquiryPage';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { SearchPage } from './pages/SearchPage';

function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="products/:id/enquire" element={<EnquiryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
