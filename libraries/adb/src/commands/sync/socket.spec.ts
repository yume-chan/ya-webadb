import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import { AdbSyncSocket } from "./socket.js";

describe("AdbSyncSocket", () => {
    describe("lock", () => {
        it("should wait for the previous lock to be released", async () => {
            const result: number[] = [];

            const socket = new AdbSyncSocket(
                {
                    service: "",
                    close() {},
                    closed: Promise.resolve(undefined),
                    readable: new ReadableStream(),
                    writable: new WritableStream(),
                },
                1024,
            );

            const locked = await socket.lock();
            result.push(1);

            void socket.lock().then((locked) => {
                result.push(3);
                locked.release();
            });

            // Queue some microtasks to allow the above `then` callback run (although it shouldn't)
            for (let i = 0; i < 10; i += 1) {
                await Promise.resolve();
            }

            locked.release();
            result.push(2);

            // Queue some microtasks to allow the above `then` callback run
            for (let i = 0; i < 10; i += 1) {
                await Promise.resolve();
            }

            assert.deepStrictEqual(result, [1, 2, 3]);
        });
    });
});
