#!/usr/bin/env node

/// <reference types="node" />

import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

let eslintPath = resolve(import.meta.dirname, "node_modules", ".bin", "eslint");
if (process.platform === "win32") {
    eslintPath += ".cmd";
}

const eslintProcess = spawn(
    `${eslintPath} --config ${resolve(import.meta.dirname, "eslint.config.js")} --fix .`,
    {
        // https://github.com/nodejs/node/issues/52554
        shell: true,
        stdio: "inherit",
    },
);

await once(eslintProcess, "exit");

if (eslintProcess.exitCode) {
    process.exit(eslintProcess.exitCode);
}

let prettierPath = resolve(
    import.meta.dirname,
    "node_modules",
    ".bin",
    "prettier",
);
if (process.platform === "win32") {
    prettierPath += ".cmd";
}

const prettierProcess = spawn(
    `${prettierPath} src/**/*.ts ${process.env.CI ? "--check" : "--write"} --tab-width 4`,
    {
        shell: true,
        stdio: "inherit",
    },
);

await once(prettierProcess, "exit");

if (prettierProcess.exitCode) {
    process.exit(prettierProcess.exitCode);
}
