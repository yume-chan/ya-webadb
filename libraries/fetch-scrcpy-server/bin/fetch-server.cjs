#!/usr/bin/env node

const { fetchVersion } = require("gh-release-fetch");
const path = require("path");
const fs = require("fs").promises;

(async () => {
    const serverVersion = process.argv[2];
    if (!serverVersion) {
        console.log("Usage: fetch-scrcpy-server <version>");
        process.exit(1);
    }

    console.log(`Downloading Scrcpy server binary version ${serverVersion}...`);
    const binFolder = path.resolve(__dirname, "..");

    await fetchVersion({
        repository: "Genymobile/scrcpy",
        version: `v${serverVersion}`,
        package: `scrcpy-server-v${serverVersion}`,
        destination: binFolder,
        extract: false,
    });

    await fs.rename(
        path.resolve(binFolder, `scrcpy-server-v${serverVersion}`),
        path.resolve(binFolder, "server.bin")
    );

    fs.writeFile(
        path.resolve(binFolder, "index.js"),
        `
export const VERSION ='${serverVersion}';
export const BIN = new URL('./server.bin', import.meta.url);
`
    );
    fs.writeFile(
        path.resolve(binFolder, "index.d.ts"),
        `
export const VERSION: '${serverVersion}';
export const BIN: URL;
`
    );

    fs.writeFile(
        path.resolve(binFolder, "version.js"),
        `
export const VERSION ='${serverVersion}';
`
    );
    fs.writeFile(
        path.resolve(binFolder, "version.d.ts"),
        `
export const VERSION: '${serverVersion}';
`
    );
})();
