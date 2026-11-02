import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { request, setAuthTokenGetter, setRefreshTokenHandler } from '../../lib/api-client';
import type { User } from '../../lib/api-types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_TOKEN_STORAGE_KEY = 'tm_refresh_token';

// In-memory access token storage (never written to localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let singleFlightRefreshPromise: Promise<string | null> | null = null;

export function getInMemoryAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setInMemoryAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const queryClient = useQueryClient();
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const clearSession = useCallback(() => {
    inMemoryAccessToken = null;
    setUser(null);
    setStatus('unauthenticated');
    try {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    queryClient.clear();
  }, [queryClient]);

  // Single-flight silent refresh function
  const performSilentRefresh = useCallback(async (): Promise<string | null> => {
    if (singleFlightRefreshPromise) {
      return singleFlightRefreshPromise;
    }

    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!storedRefreshToken) {
      clearSession();
      return null;
    }

    singleFlightRefreshPromise = (async () => {
      try {
        const response = await request<{
          accessToken: string;
          expiresIn: number;
          refreshToken: string;
        }>('/api/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken: storedRefreshToken },
          auth: false,
        });

        inMemoryAccessToken = response.accessToken;
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken);
        return response.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        singleFlightRefreshPromise = null;
      }
    })();

    return singleFlightRefreshPromise;
  }, [clearSession]);

  // Connect API client token getter & silent refresh interceptor
  useEffect(() => {
    setAuthTokenGetter(() => inMemoryAccessToken);
    setRefreshTokenHandler(performSilentRefresh);

    return () => {
      setAuthTokenGetter(() => null);
      setRefreshTokenHandler(null);
    };
  }, [performSilentRefresh]);

  // Multi-tab logout sync
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('auth_sync_channel');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data === 'LOGOUT') {
          clearSession();
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [clearSession]);

  // Bootstrap session on page load
  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!storedRefreshToken) {
        if (isMounted) setStatus('unauthenticated');
        return;
      }

      try {
        const token = await performSilentRefresh();
        if (!token) {
          if (isMounted) setStatus('unauthenticated');
          return;
        }

        const meResponse = await request<{ user: User }>('/api/v1/auth/me', {
          auth: token,
        });

        if (isMounted) {
          setUser(meResponse.user);
          setStatus('authenticated');
        }
      } catch {
        if (isMounted) {
          clearSession();
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [clearSession, performSilentRefresh]);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await request<{
      accessToken: string;
      expiresIn: number;
      refreshToken: string;
      user: User;
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: credentials,
      auth: false,
    });

    inMemoryAccessToken = response.accessToken;
    try {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken);
    } catch {
      // Ignore storage errors
    }

    setUser(response.user);
    setStatus('authenticated');
  };

  const register = async (data: { email: string; password: string; name: string }) => {
    await request('/api/v1/auth/register', {
      method: 'POST',
      body: data,
      auth: false,
    });
  };

  const logout = async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    try {
      if (storedRefreshToken) {
        await request('/api/v1/auth/logout', {
          method: 'POST',
          body: { refreshToken: storedRefreshToken },
          auth: inMemoryAccessToken ?? undefined,
        });
      }
    } catch {
      // Ignore logout errors on network failure
    } finally {
      clearSession();
      try {
        broadcastChannelRef.current?.postMessage('LOGOUT');
      } catch {
        // Ignore broadcast errors
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
