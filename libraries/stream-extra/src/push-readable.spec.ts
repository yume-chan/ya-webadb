import { describe, expect, it, jest } from "@jest/globals";
import { delay } from "@yume-chan/async";

import type { PushReadableStreamController } from "./push-readable.js";
import { PushReadableStream } from "./push-readable.js";

describe("PushReadableStream", () => {
    describe(".cancel", () => {
        it("should abort the `AbortSignal`", async () => {
            const abortHandler = jest.fn();
            const stream = new PushReadableStream((controller) => {
                controller.abortSignal.addEventListener("abort", abortHandler);
            });
            await stream.cancel("reason");
            expect(abortHandler).toHaveBeenCalledTimes(1);
        });

        it("should ignore pending `enqueue`", async () => {
            const log = jest.fn();
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
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "waiting",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "cancel",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "cancel",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "ignored",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "start",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "ignored",
                      "source": "producer",
                    },
                  ],
                ]
            `);
        });

        it("should ignore future `enqueue`", async () => {
            const log = jest.fn();
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
            await delay(1);
            await reader.cancel("reason");
            // Add extra microtasks to allow all operations to complete
            await delay(1);
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "waiting",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "cancel",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "cancel",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "ignored",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 3,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "ignored",
                      "source": "producer",
                      "value": 3,
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "start",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "ignored",
                      "source": "producer",
                    },
                  ],
                ]
            `);
        });

        it("should allow explicit `close` call", async () => {
            const log = jest.fn();
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
            await delay(1);
            await reader.cancel("reason");
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "waiting",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "operation": "cancel",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "cancel",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "ignored",
                      "source": "producer",
                      "value": 2,
                    },
                  ],
                  [
                    {
                      "explicit": true,
                      "operation": "close",
                      "phase": "start",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": true,
                      "operation": "close",
                      "phase": "ignored",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "start",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "ignored",
                      "source": "producer",
                    },
                  ],
                ]
            `);
        });
    });

    describe(".error", () => {
        it("should reject future `enqueue`", async () => {
            let controller!: PushReadableStreamController<unknown>;
            new PushReadableStream((controller_) => {
                controller = controller_;
            });
            controller.error(new Error("error"));
            await expect(controller.enqueue(1)).rejects.toThrow();
        });

        it("should reject future `close`", () => {
            let controller!: PushReadableStreamController<unknown>;
            new PushReadableStream((controller_) => {
                controller = controller_;
            });
            controller.error(new Error("error"));
            expect(() => controller.close()).toThrow();
        });
    });

    describe("0 high water mark", () => {
        it("should allow `read` before `enqueue`", async () => {
            const log = jest.fn();
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
            await delay(1);
            await controller.enqueue(1);
            await expect(promise).resolves.toEqual({ done: false, value: 1 });
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "pull",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                ]
            `);
        });

        it("should allow `enqueue` before `read`", async () => {
            const log = jest.fn();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                },
                { highWaterMark: 0 },
                log,
            );
            const reader = stream.getReader();
            await expect(reader.read()).resolves.toEqual({
                done: false,
                value: 1,
            });
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "waiting",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "start",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "complete",
                      "source": "producer",
                    },
                  ],
                ]
            `);
        });
    });

    describe("non 0 high water mark", () => {
        it("should allow `read` before `enqueue`", async () => {
            const log = jest.fn();
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
            await delay(1);
            await controller.enqueue(1);
            await expect(promise).resolves.toEqual({ done: false, value: 1 });
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "pull",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                ]
            `);
        });

        it("should allow `enqueue` before `read`", async () => {
            const log = jest.fn();
            const stream = new PushReadableStream(
                async (controller) => {
                    await controller.enqueue(1);
                },
                { highWaterMark: 1 },
                log,
            );
            const reader = stream.getReader();
            await expect(reader.read()).resolves.toEqual({
                done: false,
                value: 1,
            });
            expect(log.mock.calls).toMatchInlineSnapshot(`
                [
                  [
                    {
                      "operation": "enqueue",
                      "phase": "start",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "enqueue",
                      "phase": "complete",
                      "source": "producer",
                      "value": 1,
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "start",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "operation": "pull",
                      "phase": "complete",
                      "source": "consumer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "start",
                      "source": "producer",
                    },
                  ],
                  [
                    {
                      "explicit": false,
                      "operation": "close",
                      "phase": "complete",
                      "source": "producer",
                    },
                  ],
                ]
            `);
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
                await delay(1);
                throw new Error("error");
            });
            const reader = stream.getReader();
            await expect(reader.closed).rejects.toThrow("error");
        });
    });

    describe(".close", () => {
        it("should close the stream", async () => {
            const stream = new PushReadableStream((controller) => {
                controller.close();
            });
            const reader = stream.getReader();
            await expect(reader.closed).resolves.toBeUndefined();
        });

        it("should work with async `source`", () => {
            const stream = new PushReadableStream(async (controller) => {
                await delay(1);
                controller.close();
            });
            const reader = stream.getReader();
            return expect(reader.closed).resolves.toBeUndefined();
        });
    });
});
