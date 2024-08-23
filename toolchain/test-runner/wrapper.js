#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";

const child = spawn(
    process.execPath,
    [
        "--enable-source-maps",
        // Disable code coverage until https://github.com/nodejs/node/pull/54444 is released
        // "--experimental-test-coverage",
        fileURLToPath(import.meta.resolve("./run-test.js", import.meta.url)),
    ],
    {
        stdio: "inherit",
        env: {
            ...process.env,
        },
    },
);

child.on("exit", (code) => {
    process.exit(code);
});
