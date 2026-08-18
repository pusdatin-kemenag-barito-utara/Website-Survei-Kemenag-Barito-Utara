import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  server: {
    port: 3000,
    host: true,
  },
  site: process.env.PUBLIC_APP_URL || "http://localhost:3000",
  output: "server",
  adapter: node({ mode: "standalone" }),
  viewTransitions: true,
  integrations: [react()],
  vite: {
    envPrefix: ["PUBLIC_"],
    define: {
      "process.env": {},
    },
    optimizeDeps: {
      include: [
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
        "@base-ui/react/alert-dialog",
        "@base-ui/react/button",
        "@base-ui/react/checkbox",
        "@base-ui/react/dialog",
        "@base-ui/react/input",
        "@base-ui/react/menu",
        "@base-ui/react/merge-props",
        "@base-ui/react/popover",
        "@base-ui/react/radio",
        "@base-ui/react/radio-group",
        "@base-ui/react/select",
        "@base-ui/react/separator",
        "@base-ui/react/switch",
        "@base-ui/react/tabs",
        "@base-ui/react/tooltip",
        "@base-ui/react/use-render",
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
