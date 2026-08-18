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

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
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
  const res = await fetch(url, {
    cache: options.cache || 'no-store',
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
