import assert from "node:assert";
import { describe, it } from "node:test";

import { arrayFromAsync } from "./array-from-async.js";

describe("arrayFromAsync", () => {
    it("should convert an async iterable", async () => {
        async function* asyncGenerator() {
            await Promise.resolve();
            yield 1;
            await Promise.resolve();
            yield 2;
            await Promise.resolve();
            yield 3;
        }
        const result = await arrayFromAsync(asyncGenerator());
        assert.deepStrictEqual(result, [1, 2, 3]);
    });

    it("should convert a synchronous iterable", async () => {
        function* syncGenerator() {
            yield 4;
            yield 5;
            yield 6;
        }
        const result = await arrayFromAsync(syncGenerator());
        assert.deepStrictEqual(result, [4, 5, 6]);
    });

    it("should convert a synchronous iterable with Promise items", async () => {
        function* syncGeneratorWithPromises() {
            yield Promise.resolve(7);
            yield Promise.resolve(8);
            yield Promise.resolve(9);
        }
        const result = await arrayFromAsync(syncGeneratorWithPromises());
        assert.deepStrictEqual(result, [7, 8, 9]);
    });
});
