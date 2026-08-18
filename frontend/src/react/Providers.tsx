import { Component, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/components/shared/I18nProvider";
import { NotFoundError } from "@/next/navigation";
import NotFoundPage from "@/react/pages/NotFoundPage";
import { MaintenanceListener } from "@/components/providers/maintenance-listener";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    if (error instanceof NotFoundError) {
      return { hasError: false, error: null };
    }
    return {
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("[SI-ARUS Error Boundary Caught]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
          <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-8 max-w-md shadow-xl backdrop-blur-md">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 mb-4 border border-rose-200 shadow-xs">
              ⚠️
            </div>
            <h2 className="text-xl font-extrabold text-rose-950 mb-2">
              Terjadi Kendala Memuat Halaman
            </h2>
            <p className="text-xs text-rose-800/80 mb-4 leading-relaxed font-medium">
              Sistem mendeteksi galat berikut saat merender komponen:
            </p>
            <p className="text-xs text-rose-800 font-mono mb-5 bg-white/90 p-3.5 rounded-2xl border border-rose-200 overflow-x-auto text-left whitespace-pre-wrap">
              {this.state.error?.message || "Kesalahan internal React"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Muat Ulang
              </button>
              <a
                href="/admin/login"
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
              >
                Kembali ke Login
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

class NotFoundBoundary extends Component<
  { children: ReactNode },
  { notFound: boolean }
> {
  state = { notFound: false };

  static getDerivedStateFromError(error: unknown) {
    if (error instanceof NotFoundError) return { notFound: true };
    return null;
  }

  render() {
    if (this.state.notFound) return <NotFoundPage />;
    return this.props.children;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <MaintenanceListener />
          <GlobalErrorBoundary>
            <NotFoundBoundary>{children}</NotFoundBoundary>
          </GlobalErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}