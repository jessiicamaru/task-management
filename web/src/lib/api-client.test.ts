import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request, setAuthTokenGetter, toFormErrors } from './api-client';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setAuthTokenGetter(() => null);
  });

  it('performs successful GET request and returns parsed JSON', async () => {
    const mockData = { id: 'usr_123', name: 'Alice' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const data = await request<typeof mockData>('/api/v1/users/me');
    expect(data).toEqual(mockData);
  });

  it('injects Bearer authorization token when auth is enabled', async () => {
    setAuthTokenGetter(() => 'test-token-xyz');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await request('/api/v1/auth/me', { auth: true });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/me'),
      expect.anything(),
    );

    const calls = fetchSpy.mock.calls as unknown as Array<
      [string | URL | Request, RequestInit | undefined]
    >;
    const firstCall = calls[0];
    const init = firstCall?.[1];
    const passedHeaders = new Headers(init?.headers);
    expect(passedHeaders.get('Authorization')).toBe('Bearer test-token-xyz');
  });

  it('throws ApiError with code, message, requestId and details on 422 response', async () => {
    const errorBody = {
      error: {
        code: 'validation_error',
        message: 'Invalid input',
        requestId: 'req_12345',
        details: [{ path: 'email', message: 'Email already exists' }],
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    try {
      await request('/api/v1/auth/register', { method: 'POST', body: {} });
      expect.unreachable('Should have thrown an ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.code).toBe('validation_error');
      expect(apiErr.requestId).toBe('req_12345');
      expect(apiErr.details).toHaveLength(1);
      expect(apiErr.details?.[0]).toEqual({ path: 'email', message: 'Email already exists' });

      // Test toFormErrors helper
      const setErrorMock = vi.fn();
      const mapped = toFormErrors(apiErr, setErrorMock);
      expect(mapped).toBe(true);
      expect(setErrorMock).toHaveBeenCalledWith('email', {
        type: 'server',
        message: 'Email already exists',
      });
    }
  });

  it('safely handles non-JSON HTML error (e.g. 502 Bad Gateway) without SyntaxError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'text/html', 'x-request-id': 'req_proxy_789' },
      }),
    );

    try {
      await request('/api/v1/projects');
      expect.unreachable('Should have thrown an ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.requestId).toBe('req_proxy_789');
    }
  });
});
