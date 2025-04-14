import {defineConfig} from "vite";
import { dirname, resolve } from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import { visualizer } from "rollup-plugin-visualizer";

function crossOriginIsolationMiddleware(_: any, response: any, next: any) {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
    emitAssets: true,
    assetsInlineLimit: 0,
    minify: "esbuild",
    rollupOptions: {
      treeshake: 'smallest',
      preserveEntrySignatures: 'strict',
      input: resolve(__dirname, 'src/index.ts'),
      output: {
        compact: true,
        manualChunks: { xstate: ['xstate'], 'sqlocal': ['sqlocal']},
        format: 'es',
        entryFileNames: 'workhorse.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
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
    visualizer(),
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
