import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 10000 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts": ["recharts"],
          "vendor-pdf": ["jspdf", "qrcode"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
