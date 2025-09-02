import * as assert from "node:assert";
import { describe, it } from "node:test";

import { serializeIntent } from "./intent.js";

describe("Intent", () => {
    describe("serializeIntent", () => {
        it("should serialize intent action", () => {
            assert.deepStrictEqual(serializeIntent({ action: "test_action" }), [
                "-a",
                "test_action",
            ]);
        });

        it("should serialize intent categories", () => {
            assert.deepStrictEqual(
                serializeIntent({ categories: ["category_1", "category_2"] }),
                ["-c", "category_1", "-c", "category_2"],
            );
        });

        it("should serialize intent package", () => {
            assert.deepStrictEqual(serializeIntent({ package: "package_1" }), [
                "-p",
                "package_1",
            ]);
        });

        it("should serialize intent component", () => {
            assert.deepStrictEqual(
                serializeIntent({
                    component: {
                        packageName: "package_1",
                        className: "component_1",
                    },
                }),
                ["-n", "package_1/component_1"],
            );
        });

        it("should serialize intent data", () => {
            assert.deepStrictEqual(serializeIntent({ data: "data_1" }), [
                "-d",
                "data_1",
            ]);
        });

        describe("extras", () => {
            it("should serialize string extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: "value1",
                        },
                    }),
                    ["--es", "key1", "value1"],
                );
            });

            it("should serialize null extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: null,
                        },
                    }),
                    ["--esn", "key1"],
                );
            });

            it("should serialize integer extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: 1,
                        },
                    }),
                    ["--ei", "key1", "1"],
                );
            });

            it("should serialize URI extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: {
                                type: "uri",
                                value: "http://example.com",
                            },
                        },
                    }),
                    ["--eu", "key1", "http://example.com"],
                );
            });

            it("should serialize component name", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: {
                                packageName: "com.example.package_1",
                                className: "com.example.component_1",
                            },
                        },
                    }),
                    [
                        "--ecn",
                        "key1",
                        "com.example.package_1/com.example.component_1",
                    ],
                );
            });

            it("should serialize integer array extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: {
                                type: "array",
                                itemType: "int",
                                value: [1, 2, 3],
                            },
                        },
                    }),
                    ["--eia", "key1", "1,2,3"],
                );
            });

            it("should serialize integer array list extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: {
                                type: "arrayList",
                                itemType: "int",
                                value: [1, 2, 3],
                            },
                        },
                    }),
                    ["--eial", "key1", "1,2,3"],
                );
            });

            it("should serialize boolean extras", () => {
                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: true,
                        },
                    }),
                    ["--ez", "key1", "true"],
                );

                assert.deepStrictEqual(
                    serializeIntent({
                        extras: {
                            key1: false,
                        },
                    }),
                    ["--ez", "key1", "false"],
                );
            });
        });
    });
});
