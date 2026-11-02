import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '../../components/ui';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-bg">
      <div className="space-y-4 max-w-md">
        <h1 className="text-6xl font-black text-accent tracking-tighter">404</h1>
        <h2 className="text-2xl font-bold text-fg">Page not found</h2>
        <p className="text-sm text-fg-muted">
          Sorry, we couldn’t find the page you’re looking for. It might have been moved or doesn’t
          exist.
        </p>
        <div className="pt-2">
          <Link to="/projects">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
