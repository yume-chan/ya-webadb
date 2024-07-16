import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import { SyncPromise } from "./sync-promise.js";

function delay(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}

describe("SyncPromise", () => {
    describe(".resolve", () => {
        it("should resolve with undefined", () => {
            const promise = SyncPromise.resolve();
            assert.strictEqual(promise.valueOrPromise(), undefined);
        });

        it("should resolve with a value", () => {
            const promise = SyncPromise.resolve(42);
            assert.strictEqual(promise.valueOrPromise(), 42);
        });

        it("should resolve with a promise", async () => {
            const promise = SyncPromise.resolve(Promise.resolve(42));
            const value = promise.valueOrPromise();
            assert.ok(value instanceof Promise);
            assert.strictEqual(await value, 42);
        });

        it("should resolve with a pending SyncPromise", async () => {
            const promise = SyncPromise.resolve(
                SyncPromise.resolve(Promise.resolve(42)),
            );
            const value = promise.valueOrPromise();
            assert.ok(value instanceof Promise);
            assert.strictEqual(await value, 42);
        });

        it("should resolve with a resolved SyncPromise", () => {
            const promise = SyncPromise.resolve(SyncPromise.resolve(42));
            assert.strictEqual(promise.valueOrPromise(), 42);
        });

        it("should resolve with a rejected SyncPromise", () => {
            const promise = SyncPromise.resolve(
                SyncPromise.reject(new Error("SyncPromise error")),
            );
            assert.throws(() => promise.valueOrPromise(), /SyncPromise error/);
        });
    });

    describe(".reject", () => {
        it("should reject with the reason", () => {
            const promise = SyncPromise.reject(new Error("error"));
            assert.throws(() => promise.valueOrPromise(), { message: "error" });
        });
    });

    describe(".try", () => {
        it("should call executor", () => {
            const executor = mock.fn(() => {
                return 42;
            });
            void SyncPromise.try(executor);
            assert.strictEqual(executor.mock.callCount(), 1);
        });

        it("should resolve with a value", () => {
            const promise = SyncPromise.try(() => 42);
            assert.strictEqual(promise.valueOrPromise(), 42);
        });

        it("should resolve with a promise", async () => {
            const promise = SyncPromise.try(() => Promise.resolve(42));
            const value = promise.valueOrPromise();
            assert.ok(value instanceof Promise);
            assert.strictEqual(await value, 42);
        });

        it("should resolve with a pending SyncPromise", async () => {
            const promise = SyncPromise.try(() =>
                SyncPromise.resolve(Promise.resolve(42)),
            );
            const value = promise.valueOrPromise();
            assert.ok(value instanceof Promise);
            assert.strictEqual(await value, 42);
        });

        it("should resolve with a resolved SyncPromise", () => {
            const promise = SyncPromise.try(() => SyncPromise.resolve(42));
            assert.strictEqual(promise.valueOrPromise(), 42);
        });

        it("should resolve with a rejected SyncPromise", () => {
            const promise = SyncPromise.try(() =>
                SyncPromise.reject(new Error("error")),
            );
            assert.throws(() => promise.valueOrPromise(), { message: "error" });
        });

        it("should reject with the error thrown", () => {
            const promise = SyncPromise.try(() => {
                throw new Error("error");
            });
            assert.throws(() => promise.valueOrPromise(), { message: "error" });
        });
    });

    describe("#then", () => {
        it("chain a pending SyncPromise with value", async () => {
            const promise = SyncPromise.resolve(Promise.resolve(42));
            const handler = mock.fn(() => "foo");
            const result = promise.then(handler);

            await delay(0);
            assert.strictEqual(handler.mock.callCount(), 1);
            assert.deepStrictEqual(handler.mock.calls[0]!.arguments, [42]);

            assert.strictEqual(await result.valueOrPromise(), "foo");
        });

        it("chian a pending SyncPromise with a promise", async () => {
            const promise = SyncPromise.resolve(Promise.resolve(42));
            const handler = mock.fn(() => Promise.resolve("foo"));
            const result = promise.then(handler);

            await delay(0);

            assert.strictEqual(handler.mock.callCount(), 1);
            assert.deepStrictEqual(handler.mock.calls[0]!.arguments, [42]);
            assert.strictEqual(await result.valueOrPromise(), "foo");
        });
    });
});
