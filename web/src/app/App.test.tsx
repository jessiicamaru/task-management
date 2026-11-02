import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';
import { Providers } from './providers';
import { routes } from './router';

describe('App', () => {
  it('renders login route when unauthenticated user navigates to root or login', () => {
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ['/login'] });
    render(
      <Providers>
        <RouterProvider router={memoryRouter} />
      </Providers>,
    );

    expect(screen.getByRole('heading', { name: /sign in to taskflow/i })).toBeInTheDocument();
  });

  it('shows a fallback instead of unmounting when a child throws', () => {
    const Broken = () => {
      throw new Error('boom');
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });
});
