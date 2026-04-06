import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { Adb } from "../../adb.js";

import { SocketPool } from "./socket-pool.js";

describe("SocketPool", () => {
    describe("acquire and release", () => {
        it("should create new socket when pool is empty", async () => {
            let createCount = 0;
            const adb = {
                maxPayloadSize: 1024,
                createSocket: () => {
                    createCount += 1;
                    let closedResolve: ((value: PromiseLike<undefined> | undefined) => void) | undefined;
                    const closedPromise = new Promise<undefined>((resolve) => {
                        closedResolve = resolve;
                    });
                    return {
                        service: "sync:",
                        close() {
                            closedResolve?.(undefined);
                        },
                        closed: closedPromise,
                        readable: new ReadableStream(),
                        writable: new WritableStream(),
                    };
                },
            } as unknown as Adb;

            const pool = new SocketPool(adb, 2);

            const socket1 = await pool.acquire();
            assert.strictEqual(createCount, 1);

            pool.release(socket1);
            const socket2 = await pool.acquire();
            assert.strictEqual(createCount, 1);
            assert.strictEqual(socket1, socket2);

            pool.release(socket2);
            await pool.dispose();
        });

        it("should create extra sockets when pool is full and close them on release", async () => {
            let createCount = 0;
            let closeCount = 0;
            const adb = {
                maxPayloadSize: 1024,
                createSocket: () => {
                    createCount += 1;
                    let closedResolve: ((value: PromiseLike<undefined> | undefined) => void) | undefined;
                    const closedPromise = new Promise<undefined>((resolve) => {
                        closedResolve = resolve;
                    });
                    return {
                        service: "sync:",
                        close() {
                            closeCount += 1;
                            closedResolve?.(undefined);
                        },
                        closed: closedPromise,
                        readable: new ReadableStream(),
                        writable: new WritableStream(),
                    };
                },
            } as unknown as Adb;

            const pool = new SocketPool(adb, 2);

            const socket1 = await pool.acquire();
            const socket2 = await pool.acquire();
            const socket3 = await pool.acquire();

            assert.strictEqual(createCount, 3);

            // Release socket1 and socket2 - they should go back to pool
            await pool.release(socket1);
            await pool.release(socket2);
            assert.strictEqual(closeCount, 0);

            // socket3 is extra (pool already has 2), should be closed on release
            await pool.release(socket3);
            assert.strictEqual(closeCount, 1);

            await pool.dispose();
            assert.strictEqual(closeCount, 3);
        });

        it("should discard socket on error", async () => {
            let closeCount = 0;
            const adb = {
                maxPayloadSize: 1024,
                createSocket: () => {
                    let closedResolve: ((value: PromiseLike<undefined> | undefined) => void) | undefined;
                    const closedPromise = new Promise<undefined>((resolve) => {
                        closedResolve = resolve;
                    });
                    return {
                        service: "sync:",
                        close() {
                            closeCount += 1;
                            closedResolve?.(undefined);
                        },
                        closed: closedPromise,
                        readable: new ReadableStream(),
                        writable: new WritableStream(),
                    };
                },
            } as unknown as Adb;

            const pool = new SocketPool(adb, 2);

            const socket = await pool.acquire();
            await pool.release(socket, true);

            // Socket should be closed
            assert.strictEqual(closeCount, 1);

            await pool.dispose();
        });

        it("should handle dispose with in-use sockets", async () => {
            let closeCount = 0;
            const adb = {
                maxPayloadSize: 1024,
                createSocket: () => {
                    let closedResolve: ((value: PromiseLike<undefined> | undefined) => void) | undefined;
                    const closedPromise = new Promise<undefined>((resolve) => {
                        closedResolve = resolve;
                    });
                    return {
                        service: "sync:",
                        close() {
                            closeCount += 1;
                            closedResolve?.(undefined);
                        },
                        closed: closedPromise,
                        readable: new ReadableStream(),
                        writable: new WritableStream(),
                    };
                },
            } as unknown as Adb;

            const pool = new SocketPool(adb, 2);

            await pool.acquire();

            // Dispose should force close in-use sockets immediately
            await pool.dispose();

            assert.strictEqual(closeCount, 1);
        });

        it("should throw error when acquiring from closed pool", async () => {
            const adb = {
                maxPayloadSize: 1024,
                createSocket: () => {
                    let closedResolve: ((value: PromiseLike<undefined> | undefined) => void) | undefined;
                    const closedPromise = new Promise<undefined>((resolve) => {
                        closedResolve = resolve;
                    });
                    return {
                        service: "sync:",
                        close() {
                            closedResolve?.(undefined);
                        },
                        closed: closedPromise,
                        readable: new ReadableStream(),
                        writable: new WritableStream(),
                    };
                },
            } as unknown as Adb;

            const pool = new SocketPool(adb, 2);
            await pool.dispose();

            await assert.rejects(
                async () => await pool.acquire(),
                /SocketPool is closed/,
            );
        });
    });
});
