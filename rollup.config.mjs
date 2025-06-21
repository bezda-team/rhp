// import resolve from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
// import typescript from '@rollup/plugin-typescript';
// import { dts } from 'rollup-plugin-dts';
// import json from '@rollup/plugin-json';
// import serve from 'rollup-plugin-serve';
// import livereload from 'rollup-plugin-livereload';
// import packageJson from "./package.json" with { type: "json" };

// const isDev = process.env.ROLLUP_WATCH;

// const config = [
//     {
//         input: 'src/index.ts',
//         output: [
//             {
//                 file: packageJson.main,
//                 format: 'cjs',
//                 sourcemap: true,
//             },
//             {
//                 file: packageJson.module,
//                 format: 'esm',
//                 sourcemap: true,
//             },
//         ],
//         plugins: [
//             resolve({
//                 browser: true,
//                 preferBuiltins: false,
//             }),
//             commonjs(),
//             json(),
//             typescript({
//                 tsconfig: './tsconfig.json',
//                 exclude: ["src/*.tsx", "src/*.ts"]
//             }),
//             isDev && serve({
//                 open: true,
//                 contentBase: ['dist', 'public'],
//                 port: 3000,
//             }),
//             isDev && livereload({
//                 watch: ['dist', 'public'],
//             }),
//         ],
//         external: ['react', 'react-dom'],
//     },
//     {
//         input: 'dist/esm/types/index.d.ts',
//         output: [{ file: "dist/index.d.ts", format: 'esm' }],
//         plugins: [dts()],
//         external: ['react', 'react-dom'],
//     }
// ];

// export default config;