import { defineConfig } from "vite";
import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  root: resolve(__dirname, 'examples'),
  build: {
    target: "es2022",
    outDir: "dist",
  },
  plugins: [
    tsconfigPaths(),
  ],
});
