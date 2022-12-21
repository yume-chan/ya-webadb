module.exports = {
    "extends": [
        "@yume-chan"
    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: [
            "./tsconfig.test.json"
        ],
    },
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        // "@typescript-eslint/no-unsafe-argument": "off",
        // "@typescript-eslint/no-unsafe-assignment": "off",
        // "@typescript-eslint/no-unsafe-call": "off",
        // "@typescript-eslint/no-unsafe-member-access": "off",
        // "@typescript-eslint/no-unsafe-return": "off",
    },
}
