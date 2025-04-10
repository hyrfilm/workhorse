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
    sourcemap: true,

    lib: {
      entry: {
        lib: resolve(__dirname, 'src/main.ts'),
      },
      name: 'workhorse',
      fileName: 'workhorse',
    },
    rollupOptions: {
      output: {
        format: 'es',
      },  
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
