import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // the api Worker under `alchemy dev` (see apps/api/src/index.ts)
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
