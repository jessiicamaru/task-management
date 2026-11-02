import { Navigate, Outlet, useLocation } from 'react-router';

import { Spinner } from '../components/ui';
import { useAuth } from '../features/auth';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-bg"
        role="status"
        aria-label="Loading application"
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-accent" />
          <p className="text-sm font-medium text-fg-muted">Loading session...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-bg"
        role="status"
        aria-label="Loading application"
      >
        <Spinner size="lg" className="text-accent" />
      </div>
    );
  }

  if (status === 'authenticated') {
    const from =
      (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/projects';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
