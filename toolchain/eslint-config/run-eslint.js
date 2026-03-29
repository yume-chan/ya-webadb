#!/usr/bin/env node

/// <reference types="node" />

import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

let eslint = resolve(import.meta.dirname, "node_modules", ".bin", "eslint");
if (process.platform === "win32") {
    eslint += ".cmd";
}

const child = spawn(
    `${eslint} --config ${resolve(import.meta.dirname, "eslint.config.js")} --fix .`,
    {
        // https://github.com/nodejs/node/issues/52554
        shell: true,
        stdio: "inherit",
    },
);

await once(child, "exit");

if (child.exitCode) {
    process.exit(child.exitCode);
}
