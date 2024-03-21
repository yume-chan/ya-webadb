import { describe, expect, it, jest } from "@jest/globals";

import { WritableStream } from "./stream.js";
import { WrapWritableStream } from "./wrap-writable.js";

describe("WrapWritableStream", () => {
    describe("start", () => {
        it("should accept a WritableStream", async () => {
            const stream = new WritableStream();
            const wrapper = new WrapWritableStream(stream);
            await wrapper.close();
            expect(wrapper.writable).toBe(stream);
        });

        it("should accept a start function", async () => {
            const stream = new WritableStream();
            const start = jest.fn<() => WritableStream<number>>(() => stream);
            const wrapper = new WrapWritableStream(start);
            await stream.close();
            expect(start).toHaveBeenCalledTimes(1);
            expect(wrapper.writable).toBe(stream);
        });

        it("should accept a start object", async () => {
            const stream = new WritableStream();
            const start = jest.fn<() => WritableStream<number>>(() => stream);
            const wrapper = new WrapWritableStream({ start });
            await wrapper.close();
            expect(start).toHaveBeenCalledTimes(1);
            expect(wrapper.writable).toBe(stream);
        });
    });

    describe("write", () => {
        it("should write to inner stream", async () => {
            const write = jest.fn<() => void>();
            const stream = new WrapWritableStream(
                new WritableStream({
                    write,
                }),
            );
            const writer = stream.getWriter();
            const data = {};
            await writer.write(data);
            await writer.close();
            expect(write).toHaveBeenCalledTimes(1);
            expect(write).toHaveBeenCalledWith(data, expect.anything());
        });
    });

    describe("close", () => {
        it("should close wrapper", async () => {
            const close = jest.fn<() => void>();
            const stream = new WrapWritableStream({
                start() {
                    return new WritableStream();
                },
                close,
            });
            await expect(stream.close()).resolves.toBe(undefined);
            expect(close).toHaveBeenCalledTimes(1);
        });

        it("should close inner stream", async () => {
            const close = jest.fn<() => void>();
            const stream = new WrapWritableStream(
                new WritableStream({
                    close,
                }),
            );
            await expect(stream.close()).resolves.toBe(undefined);
            expect(close).toHaveBeenCalledTimes(1);
        });

        it("should not close inner stream twice", async () => {
            const stream = new WrapWritableStream(new WritableStream());
            await expect(stream.close()).resolves.toBe(undefined);
        });
    });

    describe("abort", () => {
        it("should close wrapper", async () => {
            const close = jest.fn<() => void>();
            const stream = new WrapWritableStream({
                start() {
                    return new WritableStream();
                },
                close,
            });
            await expect(stream.abort()).resolves.toBe(undefined);
            expect(close).toHaveBeenCalledTimes(1);
        });

        it("should abort inner stream", async () => {
            const abort = jest.fn<() => void>();
            const stream = new WrapWritableStream(
                new WritableStream({
                    abort,
                }),
            );
            await expect(stream.abort()).resolves.toBe(undefined);
            expect(abort).toHaveBeenCalledTimes(1);
        });

        it("should not close inner stream twice", async () => {
            const stream = new WrapWritableStream(new WritableStream());
            await expect(stream.abort()).resolves.toBe(undefined);
        });
    });
});
