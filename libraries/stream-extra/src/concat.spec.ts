import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ConcatBufferStream, ConcatStringStream } from "./concat.js";
import { ReadableStream } from "./stream.js";

describe("ConcatStringStream", () => {
    it("should have Promise interface", () => {
        const readable = new ConcatStringStream().readable;
        assert.ok(readable instanceof ReadableStream);
        assert.ok(typeof readable.then === "function");
        assert.ok(typeof readable.catch === "function");
        assert.ok(typeof readable.finally === "function");
    });

    it("should resolve to result", async () => {
        const readable = new ReadableStream<string>({
            start(controller) {
                controller.enqueue("foo");
                controller.enqueue("bar");
                controller.close();
            },
        }).pipeThrough(new ConcatStringStream());

        assert.strictEqual(await readable, "foobar");
    });

    it("should read result", async () => {
        const readable = new ReadableStream<string>({
            start(controller) {
                controller.enqueue("foo");
                controller.enqueue("bar");
                controller.close();
            },
        }).pipeThrough(new ConcatStringStream());

        const reader = readable.getReader();
        assert.deepStrictEqual(await reader.read(), {
            done: false,
            value: "foobar",
        });
        assert.deepStrictEqual(await reader.read(), {
            done: true,
            value: undefined,
        });
    });

    it("should report error when aborted", async () => {
        const stream = new ConcatStringStream();
        const reason = new Error("aborted");
        await stream.writable.getWriter().abort(reason);
        await assert.rejects(() => stream.readable, reason);
        await assert.rejects(() => stream.readable.getReader().read(), reason);
    });
});

describe("ConcatBufferStream", () => {
    it("should have Promise interface", () => {
        const readable = new ConcatBufferStream().readable;
        assert.ok(readable instanceof ReadableStream);
        assert.ok(typeof readable.then === "function");
        assert.ok(typeof readable.catch === "function");
        assert.ok(typeof readable.finally === "function");
    });

    it("should return empty buffer if no input", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        assert.deepStrictEqual(await readable, new Uint8Array());
    });

    it("should return one segment", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        assert.deepStrictEqual(await readable, new Uint8Array([1, 2, 3]));
    });

    it("should resolve to result", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.enqueue(new Uint8Array([4, 5, 6]));
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        assert.deepStrictEqual(
            await readable,
            new Uint8Array([1, 2, 3, 4, 5, 6]),
        );
    });

    it("should read result", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.enqueue(new Uint8Array([4, 5, 6]));
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        const reader = readable.getReader();
        assert.deepStrictEqual(await reader.read(), {
            done: false,
            value: new Uint8Array([1, 2, 3, 4, 5, 6]),
        });
        assert.deepStrictEqual(await reader.read(), {
            done: true,
            value: undefined,
        });
    });

    it("should report error when aborted", async () => {
        const stream = new ConcatBufferStream();
        const reason = new Error("aborted");
        await stream.writable.getWriter().abort(reason);
        await assert.rejects(() => stream.readable, reason);
        await assert.rejects(() => stream.readable.getReader().read(), reason);
    });
});
