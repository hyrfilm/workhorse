import { defineConfig } from "vite";

function crossOriginIsolationMiddleware(_, response, next) {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
}

export default defineConfig({
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
