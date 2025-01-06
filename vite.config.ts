import { defineConfig } from "vite";
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths'

function crossOriginIsolationMiddleware(_, response, next) {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
}

export default defineConfig({
  server: {
    hmr: {
      host: 'localhost',
    },
  },
  build: {
    target: "es2022",
  },
  plugins: [
    tsconfigPaths(),
    {
      name: 'cross-origin-isolation',
      configureServer: server => { server.middlewares.use(crossOriginIsolationMiddleware); },
      configurePreviewServer: server => { server.middlewares.use(crossOriginIsolationMiddleware); },
    },
  ],
  optimizeDeps: {
    exclude: ["sqlocal"],
  },
});
