/// <reference types="node" />

import JSON5 from "json5";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
/**
 * @type {string[]}
 */
const packages = [];

packages.push(path.join(root, "apps", "cli"));
for (const file of fs.readdirSync(path.join(root, "libraries"))) {
    packages.push(path.join(root, "libraries", file));
}
for (const file of fs.readdirSync(path.join(root, "toolchain"))) {
    packages.push(path.join(root, "toolchain", file));
}

const REMOVE_DEPS = ["@jest/globals", "cross-env", "eslint", "jest", "ts-jest"];
const DEP_VERSIONS = {
    "@types/node": "^20.14.9",
    prettier: "^3.3.3",
    typescript: "^5.5.3",
};

for (const p of packages) {
    const packageJsonPath = path.join(p, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (packageJson.dependencies) {
        packageJson.dependencies = Object.fromEntries(
            Object.entries(packageJson.dependencies)
                .filter(([name]) => {
                    if (
                        packageJson.name === "@yume-chan/eslint-config" &&
                        name === "eslint"
                    ) {
                        return true;
                    }
                    return !REMOVE_DEPS.includes(name);
                })
                .sort(([a], [b]) => a.localeCompare(b)),
        );
    }
    if (packageJson.devDependencies) {
        for (const [dep, version] of Object.entries(DEP_VERSIONS)) {
            if (packageJson.devDependencies[dep]) {
                packageJson.devDependencies[dep] = version;
            }
        }

        packageJson.devDependencies = Object.fromEntries(
            Object.entries(packageJson.devDependencies).filter(
                ([name]) => !REMOVE_DEPS.includes(name),
            ),
        );

        if (packageJson.scripts) {
            packageJson.devDependencies["@yume-chan/eslint-config"] =
                "workspace:^1.0.0";
            packageJson.scripts.lint =
                "run-eslint && prettier src/**/*.ts --write --tab-width 4";

            if (packageJson.scripts.test) {
                packageJson.devDependencies["@yume-chan/test-runner"] =
                    "workspace:^1.0.0";
                packageJson.devDependencies["@types/node"] = "^20.14.9";
                packageJson.scripts.test = "run-test";
            }

            packageJson.scripts = Object.fromEntries(
                Object.entries(packageJson.scripts).sort(([a], [b]) =>
                    a.localeCompare(b),
                ),
            );
        }

        packageJson.devDependencies = Object.fromEntries(
            Object.entries(packageJson.devDependencies).sort(([a], [b]) =>
                a.localeCompare(b),
            ),
        );
    }
    fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 4) + "\n",
    );

    const tsConfigPath = path.join(p, "tsconfig.json");
    if (fs.existsSync(tsConfigPath)) {
        const tsConfig = JSON5.parse(fs.readFileSync(tsConfigPath, "utf8"));
        tsConfig.references ??= [];

        const testTsConfigPath = path.join(p, "tsconfig.test.json");
        if (fs.existsSync(testTsConfigPath)) {
            if (
                !tsConfig.references.some(
                    (ref) => ref.path === "./tsconfig.test.json",
                )
            ) {
                tsConfig.references.push({ path: "./tsconfig.test.json" });
            }
        } else if (
            tsConfig.references.some(
                (ref) => ref.path === "./tsconfig.test.json",
            )
        ) {
            tsConfig.references = tsConfig.references.filter(
                (ref) => ref.path !== "./tsconfig.test.json",
            );
        }
        tsConfig.references.sort((a, b) => a.path.localeCompare(b.path));
        fs.writeFileSync(
            tsConfigPath,
            JSON.stringify(tsConfig, null, 4) + "\n",
        );

        const buildTsConfigPath = path.join(p, "tsconfig.build.json");
        if (fs.existsSync(buildTsConfigPath)) {
            try {
                const buildTsConfig = JSON5.parse(
                    fs.readFileSync(buildTsConfigPath, "utf8"),
                );
                if (buildTsConfig.references) {
                    buildTsConfig.references.sort((a, b) =>
                        a.path.localeCompare(b.path),
                    );
                }
                fs.writeFileSync(
                    buildTsConfigPath,
                    JSON.stringify(buildTsConfig, null, 4) + "\n",
                );
            } catch (e) {
                console.error(
                    "could not read buildTsConfig",
                    buildTsConfigPath,
                );
            }
        }
    }
}
