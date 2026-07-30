import assert from "node:assert";
import { describe, it, mock } from "node:test";

import { PromiseResolver } from "@yume-chan/async";
import type {
    MaybeConsumable,
    ReadableStreamDefaultController,
} from "@yume-chan/stream-extra";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { Adb } from "../../../adb.js";

import { AdbShellProtocolProcessImpl } from "./process.js";
import { AdbShellProtocolId, AdbShellProtocolPacket } from "./shared.js";

function createMockSocket(): [
    Adb.Socket,
    ReadableStreamDefaultController<Uint8Array>,
    PromiseResolver<undefined>,
] {
    const closed = new PromiseResolver<undefined>();
    let controller!: ReadableStreamDefaultController<Uint8Array>;

    const socket = {
        service: "",
        close() {}, // `AdbShellProtocolProcessImpl` won't call this
        closed: closed.promise,
        readable: new ReadableStream({
            async start(controller_) {
                controller = controller_;

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
                controller.close();
            },
        }),
        writable: new WritableStream(),
    } satisfies Adb.Socket;

    return [socket, controller, closed];
}

async function assertResolves<T>(promise: Promise<T>, expected: T) {
    return assert.deepStrictEqual(await promise, expected);
}

describe("AdbShellProtocolProcessImpl", () => {
    describe("`stdout` and `stderr`", () => {
        it("should parse data from `socket", async () => {
            const [socket] = createMockSocket();

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
        });

        it("should be able to be cancelled", async () => {
            const [socket, controller] = createMockSocket();

            const process = new AdbShellProtocolProcessImpl(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            await stdoutReader.cancel();

            // Verify `stdout` doesn't block the source stream,
            // by checking if `stderr` can still receive data.
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

            await assertResolves(stderrReader.read(), {
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });
            await assertResolves(stderrReader.read(), {
                done: false,
                value: new Uint8Array([10, 11, 12]),
            });
        });
    });

    describe("`socket` close", () => {
        describe("with `exit` message", () => {
            it("should close `stdout`, `stderr` and resolve `exited`", async () => {
                const [socket, controller, closed] = createMockSocket();

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

                controller.enqueue(
                    AdbShellProtocolPacket.serialize({
                        id: AdbShellProtocolId.Exit,
                        data: new Uint8Array([42]),
                    }),
                );
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
                const [socket, , closed] = createMockSocket();

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
            const [socket, controller, closed] = createMockSocket();

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

            controller.enqueue(new Uint8Array([7, 8, 9]));
            closed.resolve(undefined);

            await Promise.all([
                assert.rejects(stdoutReader.read()),
                assert.rejects(stderrReader.read()),
                assert.rejects(process.exited),
            ]);
        });
    });

    describe("stdin", () => {
        it("should write serialized data to `socket.writable`", async () => {
            const write = mock.fn((chunk: MaybeConsumable<Uint8Array>) => {
                void chunk;
                return Promise.resolve();
            });

            const process = new AdbShellProtocolProcessImpl({
                service: "",
                close() {},
                closed: new Promise(() => {}),
                readable: new ReadableStream(),
                writable: new WritableStream({ write }),
            } satisfies Adb.Socket);

            const writer = process.stdin.getWriter();
            await writer.write(new Uint8Array([1, 2, 3]));

            assert.deepStrictEqual(
                write.mock.calls[0]!.arguments[0],
                new Uint8Array([AdbShellProtocolId.Stdin, 3, 0, 0, 0, 1, 2, 3]),
            );
        });

        describe("close", () => {
            it("should write close message", async () => {
                const write = mock.fn((chunk: MaybeConsumable<Uint8Array>) => {
                    void chunk;
                    return Promise.resolve();
                });

                const process = new AdbShellProtocolProcessImpl({
                    service: "",
                    close: () => {},
                    closed: new Promise(() => {}),
                    readable: new ReadableStream(),
                    writable: new WritableStream({
                        write,
                    }),
                } satisfies Adb.Socket);

                const writer = process.stdin.getWriter();
                await writer.close();

                assert.deepStrictEqual(
                    write.mock.calls[0]!.arguments[0],
                    new Uint8Array([AdbShellProtocolId.CloseStdin, 0, 0, 0, 0]),
                );
            });
        });
    });

    describe("kill", () => {
        it("should close `socket`", async () => {
            const close = mock.fn(() => {});

            const process = new AdbShellProtocolProcessImpl({
                service: "",
                close,
                closed: new Promise(() => {}),
                readable: new ReadableStream(),
                writable: new WritableStream(),
            } satisfies Adb.Socket);

            await process.kill();

            assert.strictEqual(close.mock.calls.length, 1);
        });
    });
});
