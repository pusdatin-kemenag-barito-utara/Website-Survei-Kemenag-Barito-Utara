import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Sistem Sedang Pemeliharaan",
  },
  icons: {
    icon: "/kemenag.svg",
    shortcut: "/kemenag.svg",
    apple: "/apple-icon.png",
  },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
