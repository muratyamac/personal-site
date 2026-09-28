import { defineConfig } from "vite";

// In dev, /api is proxied to `wrangler dev` (port 8787).
export default defineConfig({
  server: { proxy: { "/api": "http://localhost:8787" } },
  build: { outDir: "dist", target: "es2022", chunkSizeWarningLimit: 700 } // three.js is lazy-loaded,
});
