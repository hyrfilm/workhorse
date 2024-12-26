import { defineConfig } from "vite";
import path from 'path';

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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),

      '@db': path.resolve(__dirname, './src/db'),
      '@machines': path.resolve(__dirname, './src/machines'),
      '@util': path.resolve(__dirname, './src/util'),
    }
  },
  build: {
    target: "es2022",
  },
  plugins: [
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
