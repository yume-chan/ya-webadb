import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/test.ts',
    plugins: [
        resolve(),
        typescript(),
        commonjs({
            extensions: ['.js', '.ts'],
            namedExports: {
                'xterm': ['Terminal'],
            },
        }),
    ],
    output: {
        dir: 'lib',
        format: 'iife',
        sourcemap: true,
    },
};
