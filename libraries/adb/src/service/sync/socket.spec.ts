import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import { Socket } from "./socket.js";

describe("Socket", () => {
    describe("write and read", () => {
        it("should create socket without errors", () => {
            const socket = new Socket(
                {
                    service: "",
                    close() {},
                    closed: Promise.resolve(undefined),
                    readable: new ReadableStream(),
                    writable: new WritableStream(),
                },
                1024,
            );

            assert.ok(socket);
        });
    });
});
