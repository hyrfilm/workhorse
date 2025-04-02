import { configDefaults, defineConfig } from 'vitest/config'
import { dirname } from 'node:path';
import {fileURLToPath} from "node:url";
import * as path from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        coverage: {
            exclude: [
                ...configDefaults.exclude,
                './examples/**',
                'vite.examples.config.ts',
                '**/*.d.ts',
            ],
        },
    },
    resolve: {
        alias: {
            '@events': path.resolve(__dirname, './src/events'),
            '@/db/sql': path.resolve(__dirname, './src/queue/db/sql'),
            '@': path.resolve(__dirname, './src'),
        },
    },
})