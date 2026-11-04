import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';

/** Shows the term from the URL on the search page, so the box and results agree. */
function useCurrentSearchTerm(): string {
  const [params] = useSearchParams();
  const location = useLocation();
  return location.pathname === '/search' ? (params.get('q') ?? '') : '';
}

function SearchBar({ initialTerm }: { initialTerm: string }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState(initialTerm);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form role="search" className="search-bar" onSubmit={onSubmit}>
      <label htmlFor="search-input" className="visually-hidden">
        Search products
      </label>
      <input
        id="search-input"
        type="search"
        placeholder="Search products"
        value={term}
        maxLength={100}
        onChange={(e) => setTerm(e.target.value)}
      />
      <button type="submit" className="button">
        Search
      </button>
    </form>
  );
}

function CategoryNav() {
  // Navigation failing should not take the page down, so errors render nothing.
  const state = useAsync((signal) => api.getCategories(signal), []);
  if (state.status !== 'success') return null;
  return (
    <nav aria-label="Categories" className="category-nav">
      <ul>
        {state.data.map((c) => (
          <li key={c.slug}>
            <NavLink to={`/categories/${c.slug}`}>{c.name}</NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Layout() {
  const currentTerm = useCurrentSearchTerm();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand">
            Catalogue
          </Link>
          {/* Re-keyed so the box resets when the URL's term changes (e.g. back button). */}
          <SearchBar key={currentTerm} initialTerm={currentTerm} />
        </div>
        <div className="container">
          <CategoryNav />
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">Proof of concept · Product data from Fake Store API</div>
      </footer>
    </>
  );
}
