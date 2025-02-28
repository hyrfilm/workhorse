import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname, // Set the root to the current directory
  base: "./",
  server: {
    hmr: {
      host: 'localhost',
    },
  },
  build: {
    target: "esnext",
    outDir: resolve(__dirname, '../dist/examples'), // Output directory for the examples build
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'), // Corrected input path
      },
      output: {
        dir: resolve(__dirname, '../dist/examples/js'), // Output directory for JS files
        format: 'es', // Ensure the output format is ES module
        entryFileNames: '[name].js', // Use the original file name for the output
        chunkFileNames: '[name].js', // Use the original file name for chunks
        assetFileNames: '[name].[ext]', // Use the original file name for assets
      },
    },
  },
  plugins: [
    tsconfigPaths(),
  ],
});