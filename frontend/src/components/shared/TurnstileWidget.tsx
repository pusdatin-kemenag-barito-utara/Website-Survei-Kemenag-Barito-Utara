import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (error?: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          "response-field"?: boolean;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  className?: string;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, onSuccess, onError, className },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);

    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (err) {
            console.warn("[Turnstile reset warning]", err);
          }
        }
      },
    }));

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return; // Prevent double rendering or looping

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) {
              onSuccessRef.current(token);
            }
          },
          "error-callback": () => {
            if (isMounted && onErrorRef.current) {
              onErrorRef.current();
            }
          },
          "expired-callback": () => {
            if (isMounted && widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current);
              } catch {
                // ignore
              }
            }
          },
          theme: "light",
          size: "flexible",
          "response-field": false,
        });
      } catch (err) {
        console.warn("[Turnstile render warning]", err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = "cf-turnstile-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);

      return () => {
        isMounted = false;
        script?.removeEventListener("load", renderWidget);
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return (
    <div
      ref={containerRef}
      className={
        className ||
        "w-full flex items-center justify-center [&>iframe]:!w-full [&>iframe]:!max-w-full [&_iframe]:!w-full"
      }
    />
  );
});
