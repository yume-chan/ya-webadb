#!/usr/bin/env node

import { fetchVersion } from "gh-release-fetch";
import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(dirname(import.meta.url));

const version = process.argv[2];
if (!version) {
    console.log("Usage: fetch-scrcpy-server <version>");
    process.exit(1);
}

let downloadVersion = version;
if (!downloadVersion.startsWith("v")) {
    downloadVersion = "v" + version;
}

console.log(`Downloading Scrcpy server binary version ${downloadVersion}...`);
const binFolder = resolve(__dirname, "..");

await fetchVersion({
    repository: "Genymobile/scrcpy",
    version: downloadVersion,
    package: `scrcpy-server-${downloadVersion}`,
    destination: binFolder,
    extract: false,
});

await Promise.all([
    fs.rename(
        resolve(binFolder, `scrcpy-server-${downloadVersion}`),
        resolve(binFolder, "server.bin"),
    ),
    fs.writeFile(
        resolve(binFolder, "index.js"),
        `
export const VERSION = '${version}';
export const BIN = /* #__PURE__ */ new URL('./server.bin', import.meta.url);
    `,
    ),
    fs.writeFile(
        resolve(binFolder, "index.d.ts"),
        `
export const VERSION: '${version}';
export const BIN: URL;
    `,
    ),
    fs.writeFile(
        resolve(binFolder, "version.js"),
        `
export const VERSION = '${version}';
    `,
    ),
    fs.writeFile(
        resolve(binFolder, "version.d.ts"),
        `
export const VERSION: '${version}';
    `,
    ),
]);
