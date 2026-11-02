import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from './session';
import { Providers } from '../../app/providers';

describe('Auth Session & Single-Flight Refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with unauthenticated status when no refresh token is stored', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    });

    // Wait until bootstrap completes
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
  });

  it('performs single-flight refresh so multiple concurrent calls trigger only 1 network request', async () => {
    localStorage.setItem('tm_refresh_token', 'initial-refresh-token');

    let refreshCallCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes('/api/v1/auth/refresh')) {
        refreshCallCount++;
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 40));
        return new Response(
          JSON.stringify({
            accessToken: 'new-fresh-access-token',
            expiresIn: 900,
            refreshToken: 'new-rotated-refresh-token',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/v1/auth/me')) {
        return new Response(
          JSON.stringify({
            user: { id: 'usr_1', email: 'alice@example.com', name: 'Alice' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Not found', { status: 404 });
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <Providers>{children}</Providers>,
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(refreshCallCount).toBe(1);
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('alice@example.com');
  });
});
