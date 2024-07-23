import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import { delay } from "@yume-chan/async";

import type {
    PushReadableLogger,
    PushReadableStreamController,
} from "./push-readable.js";
import { PushReadableStream } from "./push-readable.js";

describe("PushReadableStream", () => {
    describe(".cancel", () => {
        it("should abort the `AbortSignal`", async () => {
            const abortHandler = mock.fn();
            const stream = new PushReadableStream((controller) => {
                controller.abortSignal.addEventListener("abort", abortHandler);
            });
            await stream.cancel("reason");
            assert.strictEqual(abortHandler.mock.callCount(), 1);
        });

        it("should ignore pending `enqueue`", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                    await controller.enqueue(2);
                },
                undefined,
                log,
            );
            const reader = stream.getReader();
            await delay(0);
            await reader.cancel("reason");
            await delay(0);
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "waiting",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "cancel",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "cancel",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "ignored",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "start",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "ignored",
                            source: "producer",
                        },
                    ],
                ],
            );
        });

        it("should ignore future `enqueue`", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                    await controller.enqueue(2);
                    await controller.enqueue(3);
                },
                undefined,
                log,
            );
            const reader = stream.getReader();
            await delay(0);
            await reader.cancel("reason");
            // Add extra microtasks to allow all operations to complete
            await delay(0);
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "waiting",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "cancel",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "cancel",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "ignored",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 3,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "ignored",
                            source: "producer",
                            value: 3,
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "start",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "ignored",
                            source: "producer",
                        },
                    ],
                ],
            );
        });

        it("should allow explicit `close` call", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                    await controller.enqueue(2);
                    controller.close();
                },
                undefined,
                log,
            );
            const reader = stream.getReader();
            await delay(0);
            await reader.cancel("reason");
            await delay(0);
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "waiting",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            operation: "cancel",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "cancel",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "ignored",
                            source: "producer",
                            value: 2,
                        },
                    ],
                    [
                        {
                            explicit: true,
                            operation: "close",
                            phase: "start",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: true,
                            operation: "close",
                            phase: "ignored",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "start",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "ignored",
                            source: "producer",
                        },
                    ],
                ],
            );
        });
    });

    describe(".error", () => {
        it("should reject future `enqueue`", async () => {
            let controller!: PushReadableStreamController<unknown>;
            new PushReadableStream((controller_) => {
                controller = controller_;
            });
            controller.error(new Error("error"));
            await assert.rejects(controller.enqueue(1));
        });

        it("should reject future `close`", () => {
            let controller!: PushReadableStreamController<unknown>;
            new PushReadableStream((controller_) => {
                controller = controller_;
            });
            controller.error(new Error("error"));
            assert.throws(() => controller.close());
        });
    });

    describe("0 high water mark", () => {
        it("should allow `read` before `enqueue`", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            let controller!: PushReadableStreamController<unknown>;
            const stream = new PushReadableStream(
                (controller_) => {
                    controller = controller_;
                },
                { highWaterMark: 0 },
                log,
            );
            const reader = stream.getReader();
            const promise = reader.read();
            await delay(0);
            await controller.enqueue(1);
            assert.deepStrictEqual(await promise, {
                done: false,
                value: 1,
            });
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "pull",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                ],
            );
        });

        it("should allow `enqueue` before `read`", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                },
                { highWaterMark: 0 },
                log,
            );
            const reader = stream.getReader();
            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: 1,
            });
            await delay(0);
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "waiting",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "start",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "complete",
                            source: "producer",
                        },
                    ],
                ],
            );
        });
    });

    describe("non 0 high water mark", () => {
        it("should allow `read` before `enqueue`", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            let controller!: PushReadableStreamController<unknown>;
            const stream = new PushReadableStream(
                (controller_) => {
                    controller = controller_;
                },
                { highWaterMark: 1 },
                log,
            );
            const reader = stream.getReader();
            const promise = reader.read();
            await delay(0);
            await controller.enqueue(1);
            assert.deepStrictEqual(await promise, {
                done: false,
                value: 1,
            });
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "pull",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                ],
            );
        });

        it("should allow `enqueue` before `read`", async () => {
            const log = mock.fn<PushReadableLogger<number>>();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                },
                { highWaterMark: 1 },
                log,
            );
            const reader = stream.getReader();
            assert.deepStrictEqual(await reader.read(), {
                done: false,
                value: 1,
            });
            await delay(0);
            assert.deepStrictEqual(
                log.mock.calls.map((call) => call.arguments),
                [
                    [
                        {
                            operation: "enqueue",
                            phase: "start",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "enqueue",
                            phase: "complete",
                            source: "producer",
                            value: 1,
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "start",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            operation: "pull",
                            phase: "complete",
                            source: "consumer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "start",
                            source: "producer",
                        },
                    ],
                    [
                        {
                            explicit: false,
                            operation: "close",
                            phase: "complete",
                            source: "producer",
                        },
                    ],
                ],
            );
        });
    });

    describe("async `source`", () => {
        it("resolved Promise should close the stream", async () => {
            const stream = new PushReadableStream(async () => {});
            const reader = stream.getReader();
            await reader.closed;
        });

        it("reject Promise should error the stream", async () => {
            const stream = new PushReadableStream(async () => {
                await delay(0);
                throw new Error("error");
            });
            const reader = stream.getReader();
            await assert.rejects(reader.closed, /error/);
        });
    });

    describe(".close", () => {
        it("should close the stream", async () => {
            const stream = new PushReadableStream((controller) => {
                controller.close();
            });
            const reader = stream.getReader();
            assert.strictEqual(await reader.closed, undefined);
        });

        it("should work with async `source`", async () => {
            const stream = new PushReadableStream(async (controller) => {
                await delay(0);
                controller.close();
            });
            const reader = stream.getReader();
            assert.strictEqual(await reader.closed, undefined);
        });
    });
});
