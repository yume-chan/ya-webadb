import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';

export default {
    input: 'src/test.ts',
    plugins: [
        resolve(),
        css(),
        typescript(),
        commonjs({
            extensions: ['.js', '.ts'],
        }),
    ],
    output: {
        file: 'lib/test.js',
        format: 'iife',
        sourcemap: true,
    },
};
