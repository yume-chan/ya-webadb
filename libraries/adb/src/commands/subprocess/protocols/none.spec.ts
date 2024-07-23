import assert from "node:assert";
import { describe, it, mock } from "node:test";

import { PromiseResolver } from "@yume-chan/async";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { AdbSocket } from "../../../adb.js";

import { AdbSubprocessNoneProtocol } from "./none.js";

describe("AdbSubprocessNoneProtocol", () => {
    describe("stdout", () => {
        it("should pipe data from `socket`", async () => {
            const closed = new PromiseResolver<void>();
            const socket: AdbSocket = {
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
            };

            const process = new AdbSubprocessNoneProtocol(socket);
            const reader = process.stdout.getReader();

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
            const closed = new PromiseResolver<void>();
            const socket: AdbSocket = {
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
            };

            const process = new AdbSubprocessNoneProtocol(socket);
            const reader = process.stdout.getReader();

            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });

            closed.resolve();

            assert.deepStrictEqual(await reader.read(), {
                done: true,
                value: undefined,
            });
        });
    });

    describe("stderr", () => {
        it("should be empty", async () => {
            const closed = new PromiseResolver<void>();
            const socket: AdbSocket = {
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
            };

            const process = new AdbSubprocessNoneProtocol(socket);
            const reader = process.stderr.getReader();

            closed.resolve();

            assert.deepStrictEqual(await reader.read(), {
                done: true,
                value: undefined,
            });
        });
    });

    describe("exit", () => {
        it("should resolve when `socket` closes", async () => {
            const closed = new PromiseResolver<void>();
            const socket: AdbSocket = {
                service: "",
                close: mock.fn(() => {}),
                closed: closed.promise,
                readable: new ReadableStream(),
                writable: new WritableStream(),
            };

            const process = new AdbSubprocessNoneProtocol(socket);

            closed.resolve();

            assert.strictEqual(await process.exit, 0);
        });
    });

    it("`resize` shouldn't throw any error", () => {
        const socket: AdbSocket = {
            service: "",
            close: mock.fn(() => {}),
            closed: new PromiseResolver<void>().promise,
            readable: new ReadableStream(),
            writable: new WritableStream(),
        };

        const process = new AdbSubprocessNoneProtocol(socket);
        assert.doesNotThrow(() => process.resize());
    });

    it("`kill` should close `socket`", async () => {
        const close = mock.fn(() => {});
        const socket: AdbSocket = {
            service: "",
            close,
            closed: new PromiseResolver<void>().promise,
            readable: new ReadableStream(),
            writable: new WritableStream(),
        };

        const process = new AdbSubprocessNoneProtocol(socket);
        await process.kill();
        assert.deepEqual(close.mock.callCount(), 1);
    });
});
