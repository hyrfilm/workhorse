import {defineConfig} from "vite";
import { dirname, resolve } from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

function crossOriginIsolationMiddleware(_: any, response: any, next: any) {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: "./",
  server: {
    hmr: {
      host: 'localhost',
    },
  },
  build: {
    target: "es2022",
    lib: {
      entry: {
        lib: resolve(__dirname, 'src/main.ts'),
        demo: resolve(__dirname, 'src/index.html'),
      },
      name: 'workhorse',
      fileName: 'workhorse',
    },
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
