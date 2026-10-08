import { RouterProvider } from 'react-router';

import { ErrorBoundary } from './ErrorBoundary';
import { Providers } from './providers';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  );
}
