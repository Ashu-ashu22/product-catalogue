import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

/** Renders the whole app (real routing and pages) at a given URL. */
export function renderApp(url = '/') {
  const user = userEvent.setup();
  const utils = render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );
  return { user, ...utils };
}
