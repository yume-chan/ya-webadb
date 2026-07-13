import commonjs from "@rollup/plugin-commonjs";
import node from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
    input: "src/index.js",
    external: ["yuv-canvas"],
    treeshake: {
        manualPureFunctions: ["FinalizationRegistry"],
    },
    experimentalLogSideEffects: true,
    output: {
        dir: "dist",
        format: "esm",
    },
    plugins: [
        typescript(),
        node(),
        commonjs(),
        terser({
            module: true,
            format: {
                beautify: true,
            },
            compress: {
                passes: 10,
            },
            mangle: false,
        }),
    ],
});
