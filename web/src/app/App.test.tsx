import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { ErrorBoundary } from './ErrorBoundary';
import { routes } from './router';

describe('App', () => {
  it('renders the hello route', () => {
    render(<RouterProvider router={createMemoryRouter(routes)} />);

    expect(screen.getByRole('heading', { name: 'Task Management' })).toBeInTheDocument();
    expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
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
