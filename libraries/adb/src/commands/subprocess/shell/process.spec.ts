import assert from "node:assert";
import { describe, it } from "node:test";

import { PromiseResolver } from "@yume-chan/async";
import type { ReadableStreamDefaultController } from "@yume-chan/stream-extra";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { AdbSocket } from "../../../adb.js";

import { AdbShellProtocolProcessImpl } from "./process.js";
import { AdbShellProtocolId, AdbShellProtocolPacket } from "./shared.js";

function createMockSocket(
    readable: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
): [AdbSocket, PromiseResolver<undefined>] {
    const closed = new PromiseResolver<undefined>();
    const socket: AdbSocket = {
        service: "",
        close() {},
        closed: closed.promise,
        readable: new ReadableStream({
            async start(controller) {
                controller.enqueue(
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Stdout,
                        data: new Uint8Array([1, 2, 3]),
                    }),
                );
                controller.enqueue(
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Stderr,
                        data: new Uint8Array([4, 5, 6]),
                    }),
                );

                await closed.promise;

                readable(controller);
            },
        }),
        writable: new WritableStream(),
    };

    return [socket, closed];
}

async function assertResolves<T>(promise: Promise<T>, expected: T) {
    return assert.deepStrictEqual(await promise, expected);
}

describe("AdbShellProtocolProcessImpl", () => {
    describe("`stdout` and `stderr`", () => {
        it("should parse data from `socket", () => {
            const [socket] = createMockSocket(() => {});

            const process = new AdbShellProtocolProcessImpl(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            assertResolves(stdoutReader.read(), {
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            assertResolves(stderrReader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });
        });

        it("should be able to be cancelled", async () => {
            const [socket, closed] = createMockSocket((controller) => {
                controller.enqueue(
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Stdout,
                        data: new Uint8Array([7, 8, 9]),
                    }),
                );
                controller.enqueue(
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Stderr,
                        data: new Uint8Array([10, 11, 12]),
                    }),
                );
            });

            const process = new AdbShellProtocolProcessImpl(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            await stdoutReader.cancel();
            closed.resolve(undefined);

            assertResolves(stderrReader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });
            assertResolves(stderrReader.read(), {
                done: false,
                value: new Uint8Array([10, 11, 12]),
            });
        });
    });

    describe("`socket` close", () => {
        describe("with `exit` message", () => {
            it("should close `stdout`, `stderr` and resolve `exited`", async () => {
                const [socket, closed] = createMockSocket((controller) => {
                    controller.enqueue(
                        AdbShellProtocolPacket.serialize({
                            id: AdbShellProtocolId.Exit,
                            data: new Uint8Array([42]),
                        }),
                    );
                    controller.close();
                });

                const process = new AdbShellProtocolProcessImpl(socket);
                const stdoutReader = process.stdout.getReader();
                const stderrReader = process.stderr.getReader();

                assertResolves(stdoutReader.read(), {
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                });
                assertResolves(stderrReader.read(), {
                    done: false,
                    value: new Uint8Array([4, 5, 6]),
                });

                closed.resolve(undefined);

                assertResolves(stdoutReader.read(), {
                    done: true,
                    value: undefined,
                });
                assertResolves(stderrReader.read(), {
                    done: true,
                    value: undefined,
                });
                assert.strictEqual(await process.exited, 42);
            });
        });

        describe("with no `exit` message", () => {
            it("should close `stdout`, `stderr` and reject `exited`", async () => {
                const [socket, closed] = createMockSocket((controller) => {
                    controller.close();
                });

                const process = new AdbShellProtocolProcessImpl(socket);
                const stdoutReader = process.stdout.getReader();
                const stderrReader = process.stderr.getReader();

                assertResolves(stdoutReader.read(), {
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                });
                assertResolves(stderrReader.read(), {
                    done: false,
                    value: new Uint8Array([4, 5, 6]),
                });

                closed.resolve(undefined);

                await Promise.all([
                    assertResolves(stdoutReader.read(), {
                        done: true,
                        value: undefined,
                    }),
                    assertResolves(stderrReader.read(), {
                        done: true,
                        value: undefined,
                    }),
                    assert.rejects(process.exited),
                ]);
            });
        });
    });

    describe("`socket.readable` invalid data", () => {
        it("should error `stdout`, `stderr` and reject `exited`", async () => {
            const [socket, closed] = createMockSocket((controller) => {
                controller.enqueue(new Uint8Array([7, 8, 9]));
                controller.close();
            });

            const process = new AdbShellProtocolProcessImpl(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            await assertResolves(stdoutReader.read(), {
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            await assertResolves(stderrReader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });

            closed.resolve(undefined);

            await Promise.all([
                assert.rejects(stdoutReader.read()),
                assert.rejects(stderrReader.read()),
                assert.rejects(process.exited),
            ]);
        });
    });
});
