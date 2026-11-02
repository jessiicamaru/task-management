import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import type { ApiErrorDetail, ApiErrorPayload } from './api-types';

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  return envUrl || 'http://localhost:3000';
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[] | undefined;
  readonly requestId: string;

  constructor({
    status,
    code,
    message,
    details,
    requestId,
  }: {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[] | undefined;
    requestId: string;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean | string | undefined;
  timeoutMs?: number | undefined;
  _isRetry?: boolean | undefined;
}

let getAuthToken: (() => string | null | Promise<string | null>) | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => string | null | Promise<string | null>) {
  getAuthToken = getter;
}

export function setRefreshTokenHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    headers: customHeaders = {},
    signal,
    timeoutMs = 15000,
    _isRetry = false,
    ...rest
  } = options;

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(customHeaders);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    let token: string | null = null;
    if (typeof auth === 'string') {
      token = auth;
    } else if (getAuthToken) {
      token = await getAuthToken();
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Timeout controller with abort signal
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  let combinedSignal = timeoutController.signal;
  if (signal) {
    if (typeof AbortSignal.any === 'function') {
      combinedSignal = AbortSignal.any([signal, timeoutController.signal]);
    } else {
      signal.addEventListener('abort', () => timeoutController.abort(signal.reason), {
        once: true,
      });
    }
  }

  const startTime = Date.now();
  let response: Response | undefined;

  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        body !== undefined && !(body instanceof FormData)
          ? JSON.stringify(body)
          : (body as BodyInit),
      signal: combinedSignal,
      ...rest,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError({
        status: 408,
        code: 'request_timeout',
        message: err.message || 'Request was aborted or timed out',
        requestId: 'unknown',
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (import.meta.env.DEV) {
      const duration = Date.now() - startTime;
      console.debug(
        `[API] ${method} ${path} -> ${response ? response.status : 'ERR'} (${duration}ms)`,
      );
    }
  }

  const requestIdHeader = response.headers.get('x-request-id') || 'unknown';

  if (!response.ok) {
    let parsedBody: ApiErrorPayload | null = null;
    try {
      const text = await response.text();
      parsedBody = JSON.parse(text) as ApiErrorPayload;
    } catch {
      // Non-JSON response (e.g., 502 Bad Gateway from Render proxy or 413 HTML page)
      parsedBody = null;
    }

    const errorCode = parsedBody?.error?.code;

    // Silent refresh interceptor: trigger single refresh and retry once when token expires
    if (response.status === 401 && errorCode === 'token_expired' && !_isRetry && refreshHandler) {
      try {
        const refreshedToken = await refreshHandler();
        if (refreshedToken) {
          return await request<T>(path, {
            ...options,
            auth: refreshedToken,
            _isRetry: true,
          });
        }
      } catch {
        // If refresh fails, fall through to throw original ApiError
      }
    }

    if (parsedBody && parsedBody.error) {
      throw new ApiError({
        status: response.status,
        code: parsedBody.error.code || 'api_error',
        message: parsedBody.error.message || `Request failed with status ${response.status}`,
        details: parsedBody.error.details,
        requestId: parsedBody.error.requestId || requestIdHeader,
      });
    }

    throw new ApiError({
      status: response.status,
      code: `http_${response.status}`,
      message: response.statusText || `HTTP error ${response.status}`,
      requestId: requestIdHeader,
    });
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}

/**
 * Maps 422 API validation error details onto React Hook Form fields.
 */
export function toFormErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
): boolean {
  if (!(error instanceof ApiError) || !error.details || error.details.length === 0) {
    return false;
  }

  for (const detail of error.details) {
    if (detail.path) {
      setError(detail.path as Path<TFieldValues>, {
        type: 'server',
        message: detail.message,
      });
    }
  }

  return true;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(
      path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`,
      { ...options, method: 'GET' },
    ),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`,
      { ...options, method: 'POST', body },
    ),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(
      path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`,
      { ...options, method: 'PATCH', body },
    ),
  delete: <T = void>(path: string, options?: RequestOptions) =>
    request<T>(
      path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`,
      { ...options, method: 'DELETE' },
    ),
};
