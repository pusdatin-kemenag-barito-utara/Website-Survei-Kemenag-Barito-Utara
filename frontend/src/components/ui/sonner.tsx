import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      className="toaster group font-sans"
      icons={{
        success: <CircleCheckIcon className="size-4.5 text-emerald-600" />,
        info: <InfoIcon className="size-4.5 text-blue-600" />,
        warning: <TriangleAlertIcon className="size-4.5 text-amber-600" />,
        error: <OctagonXIcon className="size-4.5 text-rose-600" />,
        loading: (
          <Loader2Icon className="size-4.5 animate-spin text-emerald-600" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans rounded-2xl shadow-xl border border-slate-200/90 bg-white text-slate-900 p-4",
          title: "font-bold text-sm text-slate-900",
          description: "text-slate-600 text-xs font-medium mt-0.5",
          actionButton: "bg-emerald-600 text-white font-semibold rounded-xl",
          cancelButton: "bg-slate-100 text-slate-700 font-semibold rounded-xl",
        },
      }}
      {...props}
    />
  );
}
