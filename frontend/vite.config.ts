import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/recharts/")) return "charts";
          if (id.includes("/node_modules/framer-motion/")) return "motion";
          if (id.includes("/node_modules/@tanstack/")) return "query";
          if (id.includes("/node_modules/react-dom/") || id.includes("/node_modules/react/")) return "react-vendor";
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
