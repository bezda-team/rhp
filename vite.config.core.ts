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
            entryRoot: 'src', // Ensure the entry point for type generation is correct
            include: ['src/**/*.ts', 'src/**/*.tsx'], // Include all TypeScript files
        }),
    ],
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'RHPCore',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'isomorphic-dompurify', '@legendapp/state'],
        },
    }
});