/// <reference types="node" />

import { execSync } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..", "..", "libraries");
const packageNames = await readdir(root);

function parseVersion(version) {
    const [major, minor, patch] = version.split(".");
    return { major, minor, patch };
}

function compareVersions(a, b) {
    if (a.major < b.major) return -1;
    if (a.major > b.major) return 1;
    if (a.minor < b.minor) return -1;
    if (a.minor > b.minor) return 1;
    if (a.patch < b.patch) return -1;
    if (a.patch > b.patch) return 1;
    return 0;
}

let maxVersion = {
    major: 0,
    minor: 0,
    patch: 0,
};

const packages = await Promise.all(
    packageNames.map(async (name) => {
        const folder = resolve(root, name);
        const packageJsonPath = resolve(folder, "package.json");
        const { default: packageJson } = await import(
            pathToFileURL(packageJsonPath),
            { with: { type: "json" } }
        );
        const version = parseVersion(packageJson.version);
        if (compareVersions(version, maxVersion) > 0) {
            maxVersion = version;
        }
        return {
            name,
            folder,
            packageJsonPath,
            packageJson,
            version,
        };
    }),
);

const lastTag = `v${maxVersion.major}.${maxVersion.minor}.${maxVersion.patch}`;
const nextVersion = { ...maxVersion };

let majorBump = false;
switch (process.argv[2]) {
    case "major":
        majorBump = true;
        nextVersion.major++;
        nextVersion.minor = 0;
        nextVersion.patch = 0;
        break;
    case "minor":
        nextVersion.minor++;
        nextVersion.patch = 0;
        break;
    case "patch":
        nextVersion.patch++;
        break;
    default:
        console.log("Usage: node version.mjs [major|minor|patch]");
        process.exit(1);
}

const nextVersionString = `${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}`;
for (const item of packages) {
    if (!majorBump) {
        const changed = execSync(
            `git diff --name-only ${lastTag} -- "${item.folder}"`,
            { encoding: "utf8" },
        );
        console.log("output", changed);
        if (!changed) {
            console.log(`${item.name} is unchanged`);
            continue;
        }
    }

    item.packageJson.version = nextVersionString;
    await writeFile(
        item.packageJsonPath,
        JSON.stringify(item.packageJson, undefined, 4) + "\n",
    );
    console.log(`Bumped ${item.name} to ${nextVersionString}`);
}

execSync("git add --all");
const nextTag = `v${nextVersion.major}.${nextVersion.minor}.${nextVersion.patch}`;
execSync(`git commit -m "chore: release ${nextTag}"`);
execSync(`git tag -a ${nextTag} -m ${nextTag}`);
