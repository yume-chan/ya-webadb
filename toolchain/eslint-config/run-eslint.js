#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

let eslint = resolve(__dirname, "node_modules", ".bin", "eslint");
if (process.platform === "win32") {
    eslint += ".cmd";
}

const child = spawn(
    eslint,
    ["--config", resolve(__dirname, "eslint.config.js"), "--fix", "."],
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
