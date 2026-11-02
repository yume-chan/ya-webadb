#!/usr/bin/env node

/// <reference types="node" />

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
const outputFolder = resolve(__dirname, "..");

await fs.mkdir(outputFolder, { recursive: true });

const response = await fetch(
    `https://github.com/Genymobile/scrcpy/releases/download/${downloadVersion}/scrcpy-server-${downloadVersion}`,
);
if (!response.ok) {
    console.error(
        `Failed to download server.bin: ${response.status} ${response.statusText}`,
    );
    process.exit(1);
}

const binary = await response.arrayBuffer();
await fs.writeFile(resolve(outputFolder, "server.bin"), Buffer.from(binary));

await Promise.all([
    fs.writeFile(
        resolve(outputFolder, "index.js"),
        `
export const VERSION = '${version}';
export const BIN = /* #__PURE__ */ new URL('./server.bin', import.meta.url);
    `,
    ),
    fs.writeFile(
        resolve(outputFolder, "index.d.ts"),
        `
export const VERSION: '${version}';
export const BIN: URL;
    `,
    ),
    fs.writeFile(
        resolve(outputFolder, "version.js"),
        `
export const VERSION = '${version}';
    `,
    ),
    fs.writeFile(
        resolve(outputFolder, "version.d.ts"),
        `
export const VERSION: '${version}';
    `,
    ),
]);

console.log(
    `Scrcpy server binary version ${downloadVersion} downloaded successfully.`,
);
