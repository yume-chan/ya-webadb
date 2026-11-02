#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";

const child = spawn(
    process.execPath,
    [
        "--enable-source-maps",
        fileURLToPath(import.meta.resolve("./run-test.js", import.meta.url)),
    ],
    {
        shell: false,
        stdio: "inherit",
        env: {
            ...process.env,
            // Enable color output when running in `pnpm recursive run`
            FORCE_COLOR: "true",
        },
    },
);

child.on("exit", (code) => {
    process.exit(code);
});
