import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { ToastProvider, TooltipProvider } from '../components/ui';
import { AuthProvider } from '../features/auth';
import { createQueryClient } from '../lib/query';
import { ThemeProvider } from '../lib/theme';

/** App-wide providers. Server state lives in TanStack Query — not in useEffect. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
