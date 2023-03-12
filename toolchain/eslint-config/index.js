require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    plugins: ["@typescript-eslint", "import"],
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

        "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
        "import/no-cycle": "error",
        "import/no-duplicates": ["error", { "prefer-inline": false }],
        "import/order": [
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

        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/array-type": "error",
        "@typescript-eslint/consistent-type-definitions": "error",
        "@typescript-eslint/no-this-alias": "error",
        "@typescript-eslint/consistent-type-imports": [
            "error",
            {
                prefer: "type-imports",
                disallowTypeAnnotations: true,
                fixStyle: "inline-type-imports",
            },
        ],
    },
};
