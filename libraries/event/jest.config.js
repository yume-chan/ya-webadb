/** @type {import('ts-jest').InitialOptionsTsJest} */
export default {
    preset: "ts-jest/presets/default-esm",
    transform: {
        "\\.tsx?$": [
            "ts-jest",
            { tsconfig: "tsconfig.test.json", useESM: true },
        ],
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
};
