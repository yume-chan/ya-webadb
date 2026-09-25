/* eslint-disable require-yield */
import assert from "node:assert";
import { describe, it } from "node:test";

import { bipedal } from "./bipedal.js";

describe("bipedal", () => {
    describe("without async", () => {
        it("should return synchronously", () => {
            const func = bipedal(function* () {
                yield 42;
                return 42;
            });
            assert.strictEqual(func(), 42);
        });

        it("should reject synchronously", () => {
            let error!: Error;
            const func = bipedal(function* () {
                error = new Error("test");
                yield error;
                throw error;
            });
            assert.throws(() => func(), error);
        });

        it("yield should return input value", () => {
            const func = bipedal(function* () {
                const value = yield 42;
                return value;
            });
            assert.strictEqual(func(), 42);
        });

        it("then should return input value", () => {
            const func = bipedal(function* (then) {
                const value = yield* then(42);
                return value;
            });
            assert.strictEqual(func(), 42);
        });
    });

    describe("with async", () => {
        it("should return asynchronously", async () => {
            const func = bipedal(function* () {
                yield Promise.resolve();
                return 42;
            });

            const promise = func();
            assert.ok(promise instanceof Promise);

            const result = await (promise as Promise<number>);
            assert.strictEqual(result, 42);
        });

        it("should reject asynchronously", async () => {
            let error!: Error;
            const func = bipedal(function* () {
                error = new Error("test");
                yield Promise.reject(error);
                return 42;
            });

            const promise = func();
            assert.ok(promise instanceof Promise);
            await assert.rejects(async () => promise, error);
        });

        it("yield should return resolved value", async () => {
            const func = bipedal(function* () {
                const value = yield Promise.resolve(42);
                return value;
            });
            assert.strictEqual(await func(), 42);
        });

        it("then should return resolved value", async () => {
            const func = bipedal(function* (then) {
                const value = yield* then(Promise.resolve(42));
                return value;
            });
            assert.strictEqual(await func(), 42);
        });

        it("generator should be able to catch the error", async () => {
            const func = bipedal(function* () {
                try {
                    yield Promise.reject(new Error("test"));
                    return undefined;
                } catch (e) {
                    return e;
                }
            });
            const result = await func();
            assert.ok(result instanceof Error);
            assert.strictEqual(result.message, "test");
        });
    });

    it("should have target as `this` if not bound", () => {
        const context = {
            value: 42,
            func: bipedal(function* (this: { value: number }) {
                return this.value;
            }),
        };
        assert.strictEqual(context.func(), 42);
    });

    it("should bind `this` if specified", () => {
        const context = { value: 42 };
        const func = bipedal(function* () {
            return this.value;
        }, context);
        assert.strictEqual(func(), 42);
    });
});
