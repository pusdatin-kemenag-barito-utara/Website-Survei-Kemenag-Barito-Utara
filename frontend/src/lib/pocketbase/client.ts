import PocketBase from 'pocketbase';

function getEnv(key: string, fallback = '') {
  if (typeof window !== 'undefined') {
    const winEnv = (window as any).__ENV__ || (window as any).__PUBLIC_ENV__;
    if (winEnv && winEnv[key]) {
      return winEnv[key];
    }
  }
  return (import.meta.env as any)?.[key] || (process.env as any)?.[key] || fallback;
}

let pbInstance: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  const url = getEnv('PUBLIC_POCKETBASE_URL') || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!pbInstance || pbInstance.baseUrl !== url) {
    pbInstance = new PocketBase(url);
    pbInstance.autoCancellation(false);
  }
  return pbInstance;
}
