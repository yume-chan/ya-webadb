/// <reference types="node" />

import eslint from "@eslint/js";
import { dirname, resolve } from "path";
import tslint from "typescript-eslint";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export default tslint.config(
    eslint.configs.recommended,
    ...tslint.configs.recommendedTypeChecked,
    {
        ignores: ["**/*.js", "**/*.d.ts"],
    },
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: root,
                project: [
                    "libraries/*/tsconfig.test.json",
                    "libraries/*/tsconfig.build.json",
                    "apps/*/tsconfig.build.json",
                ],
            },
        },
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

            // "import/consistent-type-specifier-style": [
            //     "error",
            //     "prefer-top-level",
            // ],
            // "import/no-cycle": "error",
            // "import/no-duplicates": ["error", { "prefer-inline": false }],
            // "import/order": [
            //     "error",
            //     {
            //         groups: [
            //             "builtin",
            //             "external",
            //             "internal",
            //             "parent",
            //             "sibling",
            //             "index",
            //         ],
            //         "newlines-between": "always",
            //         alphabetize: {
            //             order: "asc",
            //         },
            //     },
            // ],

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
        },
    },
);
