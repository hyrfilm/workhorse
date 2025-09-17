import { defineConfig } from "vite";
import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function crossOriginIsolationMiddleware(_: any, response: any, next: any) {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
}

export default defineConfig({
  base: "./",
  root: resolve(__dirname, 'examples'),
  build: {
    target: "es2022",
    outDir: resolve(__dirname, 'examples/dist'),
    emptyOutDir: true,
    emitAssets: true,
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
  server: {
    hmr: {
      host: 'localhost',
    },
  },
});
