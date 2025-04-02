import assert from "node:assert";
import { describe, it, mock } from "node:test";

import { PromiseResolver } from "@yume-chan/async";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { AdbSocket } from "../../../adb.js";

import { AdbNoneProtocolProcessImpl } from "./process.js";

describe("AdbNoneProtocolProcessImpl", () => {
    describe("output", () => {
        it("should pipe data from `socket`", async () => {
            const closed = new PromiseResolver<undefined>();
            const socket = {
                service: "",
                close: () => {},
                closed: closed.promise,
                readable: new ReadableStream({
                    async start(controller) {
                        controller.enqueue(new Uint8Array([1, 2, 3]));
                        controller.enqueue(new Uint8Array([4, 5, 6]));
                        await closed.promise;
                        controller.close();
                    },
                }),
                writable: new WritableStream(),
            } satisfies AdbSocket;

            const process = new AdbNoneProtocolProcessImpl(socket);
            const reader = process.output.getReader();

            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });
        });

        it("should close when `socket` is closed", async () => {
            const closed = new PromiseResolver<undefined>();
            const socket = {
                service: "",
                close: mock.fn(() => {}),
                closed: closed.promise,
                readable: new ReadableStream({
                    async start(controller) {
                        controller.enqueue(new Uint8Array([1, 2, 3]));
                        controller.enqueue(new Uint8Array([4, 5, 6]));
                        await closed.promise;
                        controller.close();
                    },
                }),
                writable: new WritableStream(),
            } satisfies AdbSocket;

            const process = new AdbNoneProtocolProcessImpl(socket);
            const reader = process.output.getReader();

            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });

            closed.resolve(undefined);

            assert.deepStrictEqual(await reader.read(), {
                done: true,
                value: undefined,
            });
        });
    });

    describe("exit", () => {
        it("should resolve when `socket` closes", async () => {
            const closed = new PromiseResolver<undefined>();
            const socket = {
                service: "",
                close: () => {},
                closed: closed.promise,
                readable: new ReadableStream(),
                writable: new WritableStream(),
            } satisfies AdbSocket;

            const process = new AdbNoneProtocolProcessImpl(socket);

            closed.resolve(undefined);

            assert.strictEqual(await process.exited, undefined);
        });
    });

    it("`kill` should close `socket`", async () => {
        const socket = {
            service: "",
            close: mock.fn(() => {}),
            closed: new PromiseResolver<undefined>().promise,
            readable: new ReadableStream(),
            writable: new WritableStream(),
        } satisfies AdbSocket;

        const process = new AdbNoneProtocolProcessImpl(socket);
        await process.kill();

        assert.deepEqual(socket.close.mock.callCount(), 1);
    });
});
