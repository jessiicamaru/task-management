import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry client errors (4xx) like 422, 401, 403, 404, 429
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          // Retry server errors (5xx) at most once with exponential backoff
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false, // Mutations should generally not retry automatically
      },
    },
  });
}
