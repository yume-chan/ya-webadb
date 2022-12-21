import { describe, expect, it, jest } from "@jest/globals";

import { SyncPromise } from "./sync-promise.js";

function delay(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}

describe("SyncPromise", () => {
    describe(".resolve", () => {
        it("should resolve with undefined", () => {
            const promise = SyncPromise.resolve();
            expect(promise.valueOrPromise()).toBe(undefined);
        });

        it("should resolve with a value", () => {
            const promise = SyncPromise.resolve(42);
            expect(promise.valueOrPromise()).toBe(42);
        });

        it("should resolve with a promise", async () => {
            const promise = SyncPromise.resolve(Promise.resolve(42));
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it("should resolve with a pending SyncPromise", async () => {
            const promise = SyncPromise.resolve(
                SyncPromise.resolve(Promise.resolve(42))
            );
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it("should resolve with a resolved SyncPromise", () => {
            const promise = SyncPromise.resolve(SyncPromise.resolve(42));
            expect(promise.valueOrPromise()).toBe(42);
        });

        it("should resolve with a rejected SyncPromise", () => {
            const promise = SyncPromise.resolve(
                SyncPromise.reject(new Error("error"))
            );
            expect(() => promise.valueOrPromise()).toThrowError("error");
        });
    });

    describe(".reject", () => {
        it("should reject with the reason", () => {
            const promise = SyncPromise.reject(new Error("error"));
            expect(() => promise.valueOrPromise()).toThrowError("error");
        });
    });

    describe(".try", () => {
        it("should call executor", () => {
            const executor = jest.fn(() => {
                return 42;
            });
            void SyncPromise.try(executor);
            expect(executor).toHaveBeenCalledTimes(1);
        });

        it("should resolve with a value", () => {
            const promise = SyncPromise.try(() => 42);
            expect(promise.valueOrPromise()).toBe(42);
        });

        it("should resolve with a promise", async () => {
            const promise = SyncPromise.try(() => Promise.resolve(42));
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it("should resolve with a pending SyncPromise", async () => {
            const promise = SyncPromise.try(() =>
                SyncPromise.resolve(Promise.resolve(42))
            );
            await expect(promise.valueOrPromise()).resolves.toBe(42);
        });

        it("should resolve with a resolved SyncPromise", () => {
            const promise = SyncPromise.try(() => SyncPromise.resolve(42));
            expect(promise.valueOrPromise()).toBe(42);
        });

        it("should resolve with a rejected SyncPromise", () => {
            const promise = SyncPromise.try(() =>
                SyncPromise.reject(new Error("error"))
            );
            expect(() => promise.valueOrPromise()).toThrowError("error");
        });

        it("should reject with the error thrown", () => {
            const promise = SyncPromise.try(() => {
                throw new Error("error");
            });
            expect(() => promise.valueOrPromise()).toThrowError("error");
        });
    });

    describe("#then", () => {
        it("chain a pending SyncPromise with value", async () => {
            const promise = SyncPromise.resolve(Promise.resolve(42));
            const handler = jest.fn(() => "foo");
            const result = promise.then(handler);

            await delay(0);

            expect(handler).toBeCalledTimes(1);
            expect(handler).toBeCalledWith(42);

            await expect(result.valueOrPromise()).resolves.toBe("foo");
        });

        it("chian a pending SyncPromise with a promise", async () => {
            const promise = SyncPromise.resolve(Promise.resolve(42));
            const handler = jest.fn(() => Promise.resolve("foo"));
            const result = promise.then(handler);

            await delay(0);

            expect(handler).toBeCalledTimes(1);
            expect(handler).toBeCalledWith(42);

            await expect(result.valueOrPromise()).resolves.toBe("foo");
        });
    });
});
