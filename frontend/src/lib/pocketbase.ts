import PocketBase from 'pocketbase';

export const DEFAULT_POCKETBASE_URL = 'https://db-survei.kemenag-baritoutara.com';

export function getPocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const winEnv = (window as unknown as { __ENV__?: { PUBLIC_POCKETBASE_URL?: string } }).__ENV__?.PUBLIC_POCKETBASE_URL;
    if (winEnv && winEnv.trim() !== '') return winEnv;
  }
  return (
    (import.meta.env.PUBLIC_POCKETBASE_URL as string) ||
    (process.env.PUBLIC_POCKETBASE_URL as string) ||
    (process.env.POCKETBASE_URL as string) ||
    DEFAULT_POCKETBASE_URL
  );
}

export const pb = new PocketBase(getPocketBaseUrl());
pb.autoCancellation(false);

export function getPocketBaseClient() {
  const url = getPocketBaseUrl();
  const client = new PocketBase(url);
  client.autoCancellation(false);
  return client;
}

export const getPocketBase = getPocketBaseClient;

export default pb;
