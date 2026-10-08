import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors anywhere below it, so one broken component shows a fallback instead of
 * unmounting the whole app. Errors from event handlers and data fetching are handled where they
 * happen (TanStack Query, the API client), not here.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <main role="alert" className="mx-auto max-w-xl p-8">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-text-muted mt-2">Reload the page to try again.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
