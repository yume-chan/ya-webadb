import node from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
    input: "src/index.js",
    experimentalLogSideEffects: true,
    output: {
        name: "index",
        file: "dist/index.js",
        format: "esm",
    },
    plugins: [
        typescript(),
        node(),
        // terser({
        //     module: true,
        //     format: {
        //         beautify: true,
        //     },
        // }),
    ],
});
