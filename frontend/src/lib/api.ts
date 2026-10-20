function getFullApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (typeof window !== 'undefined') {
    // In browser, same-origin relative path is fast, robust, and handles both localhost and production
    return `/api/v1${cleanEndpoint}`;
  }

  const base = (process.env.INTERNAL_API_URL || process.env.API_PROXY_TARGET || import.meta.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (base) {
    if (base.endsWith('/api/v1')) {
      return `${base}${cleanEndpoint}`;
    }
    return `${base}/api/v1${cleanEndpoint}`;
  }

  return `/api/v1${cleanEndpoint}`;
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = getFullApiUrl(endpoint);
  const maxRetries = options.retries ?? (options.method && options.method !== 'GET' ? 1 : 2);
  const timeoutMs = options.timeoutMs ?? 15000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        cache: options.cache || 'no-store',
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Retry on temporary server gateway errors (502, 503, 504)
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
          continue;
        }

        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err;

      // If aborted by caller, don't retry
      if (options.signal?.aborted) {
        throw err;
      }

      // Check if network error or timeout
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && (err.message.includes('fetch') || err.message.includes('network')));

      if (isNetworkError && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}
