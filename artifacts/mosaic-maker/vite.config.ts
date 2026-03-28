import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Do not use `PORT` for the Vite dev/preview listen port. That variable is
// reserved for Express (Replit, api-server). If Vite bound the same port as
// the proxy target, `/api` would proxy back to Vite and return 502 with no
// Express logs.
export default defineConfig(({ mode }) => {
  const root = import.meta.dirname;
  const fileEnv = {
    ...loadEnv(mode, root, "VITE_"),
    ...loadEnv(mode, root, "API_"),
    ...loadEnv(mode, root, "FRONTEND_"),
  };

  const vitePort = Number(
    fileEnv.VITE_DEV_PORT ||
      fileEnv.FRONTEND_PORT ||
      process.env.VITE_DEV_PORT ||
      process.env.FRONTEND_PORT ||
      5173,
  );

  const apiPort =
    fileEnv.API_PORT || process.env.API_PORT || "3000";
  const apiProxyTarget =
    fileEnv.API_PROXY_TARGET ||
    process.env.API_PROXY_TARGET ||
    `http://localhost:${apiPort}`;

  const apiProxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
      // Mosaic generation can take a long time; short defaults can surface as 502.
      timeout: 600_000,
      proxyTimeout: 600_000,
    },
  };

  return {
    base: "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: vitePort,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: apiProxy,
    },
    preview: {
      port: vitePort,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: apiProxy,
    },
  };
});
