
import { useMemo, useSyncExternalStore } from "react";

function getPathname(): string {
  return typeof window !== "undefined" ? window.location.pathname : "";
}

function getSearch(): string {
  return typeof window !== "undefined" ? window.location.search : "";
}

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("pushstate", callback);
  window.addEventListener("replacestate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("pushstate", callback);
    window.removeEventListener("replacestate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathname, () => "");
}

export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, getSearch, () => "");
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams(): Record<string, string | string[]> {
  const syncPathname = usePathname();
  const pathname =
    typeof window !== "undefined" && window.location.pathname
      ? window.location.pathname
      : syncPathname;
  const params: Record<string, string> = {};

  const hasilMatch = pathname.match(/^\/hasil\/([^/]+)\/?$/);
  if (hasilMatch) {
    params.type = hasilMatch[1];
    return params;
  }

  const arsipMatch = pathname.match(/^\/arsip\/([^/]+)\/(\d{4})\/([^/]+)\/?$/);
  if (arsipMatch) {
    params.type = arsipMatch[1];
    params.year = arsipMatch[2];
    params.period = arsipMatch[3];
  }

  return params;
}

const defaultRouter = {
  push: (href: string) => {
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  },
  replace: (href: string) => {
    if (typeof window !== "undefined") {
      window.location.replace(href);
    }
  },
  back: () => {
    if (typeof window !== "undefined") window.history.back();
  },
  forward: () => {
    if (typeof window !== "undefined") window.history.forward();
  },
  refresh: () => {
    if (typeof window !== "undefined") window.location.reload();
  },
  prefetch: () => {},
};

export function useRouter() {
  return defaultRouter;
}

export class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export function notFound(): never {
  throw new NotFoundError();
}

export function redirect(url: string): never {
  if (typeof window !== "undefined") {
    window.location.replace(url);
  }
  throw new Error(`redirect(${url})`);
}