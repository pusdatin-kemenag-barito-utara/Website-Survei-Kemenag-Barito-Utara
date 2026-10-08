import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  server: {
    port: 3000,
    host: true,
  },
  site: process.env.PUBLIC_APP_URL,
  output: "server",
  adapter: node({ mode: "standalone" }),
  viewTransitions: true,
  integrations: [react()],
  vite: {
    envPrefix: ["PUBLIC_"],
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@radix-ui/react-dialog",
        "pocketbase",
        "@tanstack/react-query",
        "framer-motion",
        "lucide-react",
        "sonner",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
        "zod",
        "react-hook-form",
        "@hookform/resolvers/zod",
        "date-fns",
        "recharts",
        "qrcode",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
        "@base-ui/react/button",
        "@base-ui/react/input",
        "@base-ui/react/select",
        "@base-ui/react/tabs",
        "@base-ui/react/switch",
        "@base-ui/react/popover",
        "@base-ui/react/dialog",
        "@base-ui/react/use-render",
        "@base-ui/react/merge-props",
        "@base-ui/react/menu",
        "@base-ui/react/checkbox",
        "@base-ui/react/radio",
        "@base-ui/react/radio-group",
        "@base-ui/react/separator",
        "@base-ui/react/tooltip",
      ],
      exclude: ["@react-pdf/renderer", "exceljs"],
    },
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        next: fileURLToPath(new URL("./src/next", import.meta.url)),
      },
    },
  },
});
