function getFullApiUrl(endpoint: string): string {
  const base = (import.meta.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

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
