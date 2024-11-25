#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, opendir } from "node:fs/promises";
import { resolve } from "node:path";
import { Transform } from "node:stream";
import { run } from "node:test";
import { lcov, spec } from "node:test/reporters";
import { fileURLToPath } from "node:url";

let tsc = resolve(
    fileURLToPath(import.meta.url),
    "..",
    "node_modules",
    ".bin",
    "tsc",
);
if (process.platform === "win32") {
    tsc += ".cmd";
}

const child = spawn(tsc, ["-p", "tsconfig.test.json"], {
    shell: true,
    stdio: "inherit",
});

await once(child, "exit");
if (child.exitCode !== 0) {
    process.exit(child.exitCode);
}

/** @type {string[]} */
const tests = [];
/**
 * @param {string} path
 */
async function findTests(path) {
    for await (const entry of await opendir(path)) {
        if (entry.isDirectory()) {
            await findTests(resolve(entry.parentPath, entry.name));
        } else if (entry.name.endsWith(".spec.js")) {
            tests.push(resolve(entry.parentPath, entry.name));
        }
    }
}
await findTests(resolve(process.cwd(), "esm"));

const test = run({
    concurrency: true,
    files: tests,
});
test.on("test:fail", () => {
    process.exitCode = 1;
});
const coverageFolder = resolve(process.cwd(), "coverage");
await mkdir(coverageFolder, { recursive: true });

function getPercentage(count, total) {
    return total === 0 ? 100 : (count / total) * 100;
}

const filterCoverage = test.pipe(
    new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            if (chunk.type !== "test:coverage") {
                callback(null, chunk);
                return;
            }

            const {
                data: {
                    summary,
                    summary: { totals, workingDirectory },
                },
            } = chunk;

            summary.files = summary.files.filter(
                (file) =>
                    file.path.startsWith(workingDirectory) &&
                    !file.path.endsWith(".spec.ts"),
            );

            totals.totalLineCount = 0;
            totals.totalBranchCount = 0;
            totals.totalFunctionCount = 0;
            totals.coveredLineCount = 0;
            totals.coveredBranchCount = 0;
            totals.coveredFunctionCount = 0;

            for (const file of summary.files) {
                totals.totalLineCount += file.totalLineCount;
                totals.totalBranchCount += file.totalBranchCount;
                totals.totalFunctionCount += file.totalFunctionCount;
                totals.coveredLineCount += file.coveredLineCount;
                totals.coveredBranchCount += file.coveredBranchCount;
                totals.coveredFunctionCount += file.coveredFunctionCount;
            }

            totals.coveredLinePercent = getPercentage(
                totals.coveredLineCount,
                totals.totalLineCount,
            );
            totals.coveredBranchPercent = getPercentage(
                totals.coveredBranchCount,
                totals.totalBranchCount,
            );
            totals.coveredFunctionPercent = getPercentage(
                totals.coveredFunctionCount,
                totals.totalFunctionCount,
            );

            callback(null, chunk);
        },
    }),
);

filterCoverage.pipe(spec()).pipe(process.stdout);
filterCoverage
    .pipe(lcov)
    .pipe(createWriteStream(resolve(coverageFolder, "lcov.info")));
