#!/usr/bin/env node

import { fetchVersion } from "gh-release-fetch";
import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(dirname(import.meta.url));

const serverVersion = process.argv[2];
if (!serverVersion) {
    console.log("Usage: fetch-scrcpy-server <version>");
    process.exit(1);
}

console.log(`Downloading Scrcpy server binary version ${serverVersion}...`);
const binFolder = resolve(__dirname, "..");

await fetchVersion({
    repository: "Genymobile/scrcpy",
    version: `v${serverVersion}`,
    package: `scrcpy-server-v${serverVersion}`,
    destination: binFolder,
    extract: false,
});

await Promise.all([
    fs.rename(
        resolve(binFolder, `scrcpy-server-v${serverVersion}`),
        resolve(binFolder, "server.bin"),
    ),
    fs.writeFile(
        resolve(binFolder, "index.js"),
        `
export const VERSION ='${serverVersion}';
export const BIN = new URL('./server.bin', import.meta.url);
    `,
    ),
    fs.writeFile(
        resolve(binFolder, "index.d.ts"),
        `
export const VERSION: '${serverVersion}';
export const BIN: URL;
    `,
    ),
    fs.writeFile(
        resolve(binFolder, "version.js"),
        `
export const VERSION ='${serverVersion}';
    `,
    ),
    fs.writeFile(
        resolve(binFolder, "version.d.ts"),
        `
export const VERSION: '${serverVersion}';
    `,
    ),
]);
