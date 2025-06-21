import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import json from '@rollup/plugin-json';
import svgr from "vite-plugin-svgr";
import dts from 'vite-plugin-dts';

export default defineConfig({
    publicDir: false,
    plugins: [
        react(),
        json(),
        svgr(),
        dts({
            outDir: 'dist/types',
        }),
    ],
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'RHP',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
        },
    },
});