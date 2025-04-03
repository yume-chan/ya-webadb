/// <reference types="node" />

import eslint from "@eslint/js";
import eslintImportX from "eslint-plugin-import-x";
import { dirname, resolve } from "path";
import tslint from "typescript-eslint";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export default tslint.config(
    {
        ignores: ["**/*.js", "**/*.mjs", "**/*.d.ts"],
    },
    eslint.configs.recommended,
    {
        rules: {
            "no-constant-condition": ["error", { checkLoops: false }],
            "no-plusplus": "error",
            "no-multiple-empty-lines": [
                "error",
                {
                    max: 1,
                    maxEOF: 1,
                    maxBOF: 0,
                },
            ],
            "no-fallthrough": "off",
        },
    },
    ...tslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: process.cwd(),
                projectService: { defaultProject: "tsconfig.test.json" },
            },
        },
        rules: {
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unsafe-enum-comparison": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/array-type": "error",
            "@typescript-eslint/consistent-type-definitions": "error",
            "@typescript-eslint/consistent-generic-constructors": "error",
            "@typescript-eslint/consistent-indexed-object-style": "error",
            "@typescript-eslint/no-this-alias": "error",
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-import-type-side-effects": "error",
            // causes too much false positive (with interface), only check periodically
            // "@typescript-eslint/class-methods-use-this": [
            //     "error",
            //     { ignoreOverrideMethods: true },
            // ],
            "@typescript-eslint/max-params": [
                "error",
                {
                    max: 4,
                },
            ],
        },
    },
    {
        files: ["**/*.spec.ts"],
        // Node.js `test` module violates this
        rules: { "@typescript-eslint/no-floating-promises": "off" },
    },
    {
        plugins: { "import-x": eslintImportX },
        rules: {
            "import-x/consistent-type-specifier-style": [
                "error",
                "prefer-top-level",
            ],
            "import-x/no-cycle": "error",
            "import-x/no-duplicates": ["error", { "prefer-inline": false }],
            "import-x/order": [
                "error",
                {
                    groups: [
                        "builtin",
                        "external",
                        "internal",
                        "parent",
                        "sibling",
                        "index",
                    ],
                    "newlines-between": "always",
                    alphabetize: {
                        order: "asc",
                    },
                },
            ],
        },
    },
);
