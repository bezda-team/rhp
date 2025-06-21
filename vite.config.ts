import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import svgr from "vite-plugin-svgr";

export default defineConfig({
    plugins: [
        react(),
        json(),
        typescript({
            tsconfig: './tsconfig.json',
        }), svgr()
    ],
    build: {
        sourcemap: true,
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
    },
});