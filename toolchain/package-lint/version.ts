/// <reference types="node" />

import { execSync } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inc, parse, SemVer } from "semver";

const root = resolve(import.meta.dirname, "..", "..", "libraries");
const packageNames = await readdir(root);

let maxVersion: SemVer = parse("0.0.0")!;

const packages = await Promise.all(
    packageNames.map(async (name) => {
        const folder = resolve(root, name);
        const packageJsonPath = resolve(folder, "package.json");
        const { default: packageJson } = await import(packageJsonPath, {
            with: { type: "json" },
        });
        const version = parse(packageJson.version, true, true);
        if (version.compare(maxVersion) > 0) {
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

const lastTag = "v" + maxVersion.version;
console.log("Current version", maxVersion.version);

let nextVersion: string;

let majorBump = false;
let prereleaseBump = false;
switch (process.argv[2]) {
    case "major":
        majorBump = true;
        nextVersion = inc(maxVersion, "major")!;
        break;
    case "premajor":
        majorBump = true;
        prereleaseBump = true;
        nextVersion = inc(maxVersion, "premajor", "beta", "0")!;
        break;
    case "minor":
        nextVersion = inc(maxVersion, "minor")!;
        break;
    case "preminor":
        prereleaseBump = true;
        nextVersion = inc(maxVersion, "preminor", "beta", "0")!;
        break;
    case "patch":
        nextVersion = inc(maxVersion, "patch")!;
        break;
    case "prerelease":
        prereleaseBump = true;
        nextVersion = inc(maxVersion, "prerelease", "beta", "0")!;
        break;
    default:
        console.log(
            "Usage: node version.mjs <major|premajor|minor|preminor|patch|prerelease> [dry-run]",
        );
        process.exit(1);
}

let hasAnyChange = false;
for (const item of packages) {
    if (!majorBump && !prereleaseBump) {
        const changed = execSync(
            `git diff --name-only ${lastTag} -- "${item.folder}"`,
            { encoding: "utf8" },
        );

        console.log(`git diff --name-only ${lastTag} -- "${item.folder}"`);
        console.log(changed);

        if (!changed) {
            console.log(`${item.name} is unchanged`);
            continue;
        }
    }

    item.packageJson.version = nextVersion;
    if (item.packageJson.dependencies) {
        item.packageJson.dependencies = Object.fromEntries(
            Object.entries(item.packageJson.dependencies).map(
                ([name, version]) => {
                    if ((version as string).startsWith("workspace:")) {
                        return [
                            name,
                            prereleaseBump ? "workspace:*" : "workspace:^",
                        ];
                    }
                    return [name, version];
                },
            ),
        );
    }

    console.log(`Bumped ${item.name} to ${nextVersion}`);
    hasAnyChange = true;
}

await Promise.all(
    packages.map((item) =>
        writeFile(
            item.packageJsonPath,
            JSON.stringify(item.packageJson, undefined, 4) + "\n",
        ),
    ),
);

if (!hasAnyChange) {
    console.log("No version change detected.");
    process.exit(0);
}

const nextTag = "v" + nextVersion;
const commands = [
    "git add --all",
    `git commit -m "chore: release ${nextTag}"`,
    `git tag -a ${nextTag} -m ${nextTag}`,
];

if (process.argv.includes("dry-run")) {
    for (const command of commands) {
        console.log("dry:", command);
    }
    process.exit(0);
}

for (const command of commands) {
    execSync(command);
}
