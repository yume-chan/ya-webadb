import assert from "node:assert";
import { describe, it } from "node:test";

import { Consumable } from "./consumable.js";
import { WritableStream } from "./global/index.js";

describe("Consumable", () => {
    it("should export all symbols", () => {
        assert(!!Consumable.WritableStream, "WritableStream should be define");

        assert(
            !!Consumable.WrapWritableStream,
            "WrapWritableStream should be define",
        );

        assert(!!Consumable.ReadableStream, "ReadableStream should be define");

        assert(
            !!Consumable.WrapByteReadableStream,
            "WrapByteReadableStream should be define",
        );
    });

    it("WritableStream.write should not emit unhandledRejection when sink write rejects", async () => {
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => {
            unhandled.push(reason);
        };
        process.on("unhandledRejection", onUnhandled);
        try {
            const stream = new Consumable.WritableStream<Uint8Array>({
                async write() {
                    await Promise.resolve();
                    throw new Error("sink write failed");
                },
            });
            const writer = stream.getWriter();

            await assert.rejects(
                Consumable.WritableStream.write(
                    writer,
                    new Uint8Array([1, 2, 3]),
                ),
                /sink write failed/,
            );
            await new Promise<void>((resolve) => setImmediate(resolve));
            assert.deepStrictEqual(unhandled, []);
        } finally {
            process.off("unhandledRejection", onUnhandled);
        }
    });

    it("WritableStream.write should wait for writer.write and prefer its rejection over consumed rejection", async () => {
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => {
            unhandled.push(reason);
        };
        process.on("unhandledRejection", onUnhandled);
        try {
            let writeFinished = false;
            const stream = new WritableStream<Consumable<Uint8Array>>({
                async write(chunk) {
                    chunk.error(new Error("consumed error"));
                    await new Promise<void>((resolve) => setImmediate(resolve));
                    writeFinished = true;
                    throw new Error("writer error");
                },
            });
            const writer = stream.getWriter();

            await assert.rejects(
                Consumable.WritableStream.write(
                    writer,
                    new Uint8Array([1, 2, 3]),
                ),
                (error: unknown) => {
                    assert.strictEqual(writeFinished, true);
                    assert.ok(error instanceof Error);
                    assert.strictEqual(error.message, "writer error");
                    return true;
                },
            );
            await new Promise<void>((resolve) => setImmediate(resolve));
            assert.deepStrictEqual(unhandled, []);
        } finally {
            process.off("unhandledRejection", onUnhandled);
        }
    });
});
