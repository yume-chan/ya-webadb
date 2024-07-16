import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import { WritableStream } from "./stream.js";
import { WrapWritableStream } from "./wrap-writable.js";

describe("WrapWritableStream", () => {
    describe("start", () => {
        it("should accept a WritableStream", async () => {
            const stream = new WritableStream();
            const wrapper = new WrapWritableStream(stream);
            await wrapper.close();
            assert.strictEqual(wrapper.writable, stream);
        });

        it("should accept a start function", async () => {
            const stream = new WritableStream();
            const start = mock.fn(() => stream);
            const wrapper = new WrapWritableStream(start);
            await wrapper.close();
            assert.strictEqual(start.mock.callCount(), 1);
            assert.strictEqual(wrapper.writable, stream);
        });

        it("should accept a start object", async () => {
            const stream = new WritableStream();
            const start = mock.fn(() => stream);
            const wrapper = new WrapWritableStream({ start });
            await wrapper.close();
            assert.strictEqual(start.mock.callCount(), 1);
            assert.strictEqual(wrapper.writable, stream);
        });
    });

    describe("write", () => {
        it("should write to inner stream", async () => {
            const write = mock.fn<(chunk: unknown) => void>();
            const stream = new WrapWritableStream(
                new WritableStream({
                    write,
                }),
            );
            const writer = stream.getWriter();
            const data = {};
            await writer.write(data);
            await writer.close();
            assert.strictEqual(write.mock.callCount(), 1);
            assert.deepStrictEqual(write.mock.calls[0]!.arguments[0], data);
        });
    });

    describe("close", () => {
        it("should close wrapper", async () => {
            const close = mock.fn<() => void>();
            const stream = new WrapWritableStream({
                start() {
                    return new WritableStream();
                },
                close,
            });
            await assert.doesNotReject(stream.close());
            assert.strictEqual(close.mock.callCount(), 1);
        });

        it("should close inner stream", async () => {
            const close = mock.fn<() => void>();
            const stream = new WrapWritableStream(
                new WritableStream({
                    close,
                }),
            );
            await assert.doesNotReject(stream.close());
            assert.strictEqual(close.mock.callCount(), 1);
        });

        it("should not close inner stream twice", async () => {
            const stream = new WrapWritableStream(new WritableStream());
            await assert.doesNotReject(stream.close());
        });
    });

    describe("abort", () => {
        it("should close wrapper", async () => {
            const close = mock.fn<() => void>();
            const stream = new WrapWritableStream({
                start() {
                    return new WritableStream();
                },
                close,
            });
            await assert.doesNotReject(stream.abort());
            assert.strictEqual(close.mock.callCount(), 1);
        });

        it("should abort inner stream", async () => {
            const abort = mock.fn<() => void>();
            const stream = new WrapWritableStream(
                new WritableStream({
                    abort,
                }),
            );
            await assert.doesNotReject(stream.abort());
            assert.strictEqual(abort.mock.callCount(), 1);
        });

        it("should not close inner stream twice", async () => {
            const stream = new WrapWritableStream(new WritableStream());
            await assert.doesNotReject(stream.abort());
        });
    });
});
