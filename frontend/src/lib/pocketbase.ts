import PocketBase from 'pocketbase';

export function getPocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const winEnv = (window as unknown as { __ENV__?: { PUBLIC_POCKETBASE_URL?: string } }).__ENV__?.PUBLIC_POCKETBASE_URL;
    if (winEnv) return winEnv;
  }
  return (
    (import.meta.env.PUBLIC_POCKETBASE_URL as string) ||
    (process.env.PUBLIC_POCKETBASE_URL as string) ||
    (process.env.POCKETBASE_URL as string) ||
    ''
  );
}

export const pb = new PocketBase(getPocketBaseUrl());

export function getPocketBaseClient() {
  return new PocketBase(getPocketBaseUrl());
}

export const getPocketBase = getPocketBaseClient;

export default pb;
