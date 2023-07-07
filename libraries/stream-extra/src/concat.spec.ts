import { describe, expect, it } from "@jest/globals";

import { ConcatBufferStream, ConcatStringStream } from "./concat.js";
import { ReadableStream } from "./stream.js";

describe("ConcatStringStream", () => {
    it("should have Promise interface", () => {
        const readable = new ConcatStringStream().readable;
        expect(readable).toBeInstanceOf(ReadableStream);
        expect(readable).toHaveProperty("then", expect.any(Function));
        expect(readable).toHaveProperty("catch", expect.any(Function));
        expect(readable).toHaveProperty("finally", expect.any(Function));
    });

    it("should resolve to result", async () => {
        const readable = new ReadableStream<string>({
            start(controller) {
                controller.enqueue("foo");
                controller.enqueue("bar");
                controller.close();
            },
        }).pipeThrough(new ConcatStringStream());

        await expect(readable).resolves.toBe("foobar");
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
        await expect(reader.read()).resolves.toEqual({
            done: false,
            value: "foobar",
        });
        await expect(reader.read()).resolves.toEqual({
            done: true,
            value: undefined,
        });
    });

    it("should report error when aborted", async () => {
        const stream = new ConcatStringStream();
        const reason = "aborted";
        await stream.writable.getWriter().abort(reason);
        await expect(stream.readable).rejects.toBe(reason);
        await expect(() => stream.readable.getReader().read()).rejects.toBe(
            reason,
        );
    });
});

describe("ConcatBufferStream", () => {
    it("should have Promise interface", () => {
        const readable = new ConcatBufferStream().readable;
        expect(readable).toBeInstanceOf(ReadableStream);
        expect(readable).toHaveProperty("then", expect.any(Function));
        expect(readable).toHaveProperty("catch", expect.any(Function));
        expect(readable).toHaveProperty("finally", expect.any(Function));
    });

    it("should return empty buffer if no input", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        await expect(readable).resolves.toEqual(new Uint8Array());
    });

    it("should return one segment", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        await expect(readable).resolves.toEqual(new Uint8Array([1, 2, 3]));
    });

    it("should resolve to result", async () => {
        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.enqueue(new Uint8Array([4, 5, 6]));
                controller.close();
            },
        }).pipeThrough(new ConcatBufferStream());

        await expect(readable).resolves.toEqual(
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
        await expect(reader.read()).resolves.toEqual({
            done: false,
            value: new Uint8Array([1, 2, 3, 4, 5, 6]),
        });
        await expect(reader.read()).resolves.toEqual({
            done: true,
            value: undefined,
        });
    });

    it("should report error when aborted", async () => {
        const stream = new ConcatBufferStream();
        const reason = "aborted";
        await stream.writable.getWriter().abort(reason);
        await expect(stream.readable).rejects.toBe(reason);
        await expect(() => stream.readable.getReader().read()).rejects.toBe(
            reason,
        );
    });
});
