import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import nodePath from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": nodePath.resolve(__dirname, "./src"),
      // Stub Node.js builtins used by SDK's ClientProver (not executed in ASP mode)
      path: nodePath.resolve(__dirname, "./src/stubs/node-builtins.ts"),
      url: nodePath.resolve(__dirname, "./src/stubs/node-builtins.ts"),
      "fs/promises": nodePath.resolve(__dirname, "./src/stubs/node-builtins.ts"),
      // Polyfill Node.js builtins used by SDK deps (circomlibjs, snarkjs, starknet.js)
      buffer: "buffer",
      events: "events",
      util: "util",
      stream: "stream-browserify",
    },
  },
  define: {
    "process.env": "{}",
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
