module.exports = {
    extends: ["@yume-chan"],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.test.json", "./tsconfig.worker.json"],
    },
    rules: {},
};
