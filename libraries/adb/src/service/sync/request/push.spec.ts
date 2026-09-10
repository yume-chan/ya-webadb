import * as assert from "node:assert";
import { describe, it, mock } from "node:test";
import { setImmediate } from "node:timers/promises";

import { PromiseResolver } from "@yume-chan/async";
import type { ReadableStreamDefaultController } from "@yume-chan/stream-extra";
import { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";

import type { Adb } from "../../../adb.js";
import { RequestId, ResponseId } from "../id/index.js";
import { SocketPool } from "../socket-pool.js";
import { Error as AdbSyncError, Socket } from "../socket.js";

import { sendV1 } from "./push.js";

function createMockPool(onClose?: () => Promise<void>) {
    const closed = new PromiseResolver<undefined>();
    let response!: ReadableStreamDefaultController<Uint8Array>;
    const requests: Uint8Array[] = [];
    const close = mock.fn(async () => {
        await onClose?.();
        closed.resolve(undefined);
    });
    const socket = {
        service: "sync:",
        closed: closed.promise,
        close,
        readable: new ReadableStream({
            start(controller) {
                response = controller;
            },
        }),
        writable: new MaybeConsumable.WritableStream<Uint8Array>({
            write(chunk) {
                requests.push(chunk.slice());
            },
        }),
    } satisfies Adb.Socket;
    const adb = {
        maxPayloadSize: 1024,
        createSocket: () => socket,
    } as unknown as Adb;

    return { pool: new SocketPool(adb), response, requests, close };
}

describe("sendV1", () => {
    for (const size of [0, 5]) {
        it(`should wait for OKAY after sending ${size} bytes`, async () => {
            const { pool, response, requests } = createMockPool();
            const session = await sendV1({
                pool,
                path: "/file",
                packetSize: 4,
                mtime: 0,
            });
            const writer = session.writable.getWriter();
            try {
                await writer.write(new Uint8Array(size).fill(42));
                let closed = false;
                const closePromise = writer.close().then(() => {
                    closed = true;
                });

                // Drain the stream jobs while withholding the final response.
                await setImmediate();
                assert.deepStrictEqual(
                    requests.at(-1)?.slice(-8),
                    Socket.NumberRequest.serialize({ id: RequestId.Done, arg: 0 }),
                );
                const closedBeforeResponse = closed;

                response.enqueue(
                    Socket.NumberRequest.serialize({ id: ResponseId.Ok, arg: 0 }),
                );
                await closePromise;

                assert.strictEqual(closedBeforeResponse, false);
                assert.strictEqual(session.bytesWritten, size);
            } finally {
                writer.releaseLock();
                await pool.dispose();
            }
        });
    }

    it("should reject close when FAIL arrives after DONE", async () => {
        const { pool, response, requests } = createMockPool();
        const session = await sendV1({ pool, path: "/file", mtime: 0 });
        const writer = session.writable.getWriter();
        try {
            await writer.write(new Uint8Array([1]));
            const closePromise = writer.close();

            await setImmediate();
            assert.deepStrictEqual(
                requests.at(-1)?.slice(-8),
                Socket.NumberRequest.serialize({ id: RequestId.Done, arg: 0 }),
            );
            response.enqueue(new TextEncoder().encode("FAIL"));
            response.enqueue(
                Socket.FailResponse.serialize({ message: "Permission denied" }),
            );

            await assert.rejects(
                closePromise,
                (error: unknown) =>
                    error instanceof AdbSyncError &&
                    error.message === "Permission denied",
            );
        } finally {
            writer.releaseLock();
            await pool.dispose();
        }
    });

    it("should wait for socket cleanup when aborted", async () => {
        const closeStarted = new PromiseResolver<void>();
        const closeFinished = new PromiseResolver<void>();
        const { pool, close } = createMockPool(async () => {
            closeStarted.resolve();
            await closeFinished.promise;
        });
        const session = await sendV1({ pool, path: "/file" });
        const writer = session.writable.getWriter();
        const error = new Error("Upload aborted");
        let aborted = false;
        const abortPromise = writer.abort(error).then(() => {
            aborted = true;
        });
        try {
            await closeStarted.promise;
            await setImmediate();
            const abortedBeforeCleanup = aborted;

            closeFinished.resolve();
            await abortPromise;

            assert.strictEqual(abortedBeforeCleanup, false);
            assert.strictEqual(close.mock.callCount(), 1);
            await assert.rejects(writer.closed, error);
        } finally {
            closeFinished.resolve();
            await abortPromise;
            writer.releaseLock();
            await pool.dispose();
        }
    });
});
