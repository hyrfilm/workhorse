import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';

export default defineConfig({
    input: './types/index.d.ts',
    output: {
        file: './dist/workhorse.d.ts',
        format: 'es',
    },
    plugins: [
        dts({
            respectExternal: true,
            tsconfig: './tsconfig.build.json'
        }),
    ],
});
