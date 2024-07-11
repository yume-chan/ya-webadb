import { describe, expect, it } from "@jest/globals";
import { PromiseResolver } from "@yume-chan/async";
import {
    ReadableStream,
    type ReadableStreamDefaultController,
    WritableStream,
} from "@yume-chan/stream-extra";
import { type AdbSocket } from "../../../adb.js";
import {
    AdbShellProtocolId,
    AdbShellProtocolPacket,
    AdbSubprocessShellProtocol,
} from "./shell.js";

function createMockSocket(
    readable: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
): [AdbSocket, PromiseResolver<void>] {
    const closed = new PromiseResolver<void>();
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

describe("AdbSubprocessShellProtocol", () => {
    describe("`stdout` and `stderr`", () => {
        it("should parse data from `socket", async () => {
            const [socket] = createMockSocket(() => {});

            const process = new AdbSubprocessShellProtocol(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            await expect(stdoutReader.read()).resolves.toEqual({
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            await expect(stderrReader.read()).resolves.toEqual({
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

            const process = new AdbSubprocessShellProtocol(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            stdoutReader.cancel();
            closed.resolve();

            await expect(stderrReader.read()).resolves.toEqual({
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });
            await expect(stderrReader.read()).resolves.toEqual({
                done: false,
                value: new Uint8Array([10, 11, 12]),
            });
        });
    });

    describe("`socket` close", () => {
        describe("with `exit` message", () => {
            it("should close `stdout`, `stderr` and resolve `exit`", async () => {
                const [socket, closed] = createMockSocket(
                    async (controller) => {
                        controller.enqueue(
                            AdbShellProtocolPacket.serialize({
                                id: AdbShellProtocolId.Exit,
                                data: new Uint8Array([42]),
                            }),
                        );
                        controller.close();
                    },
                );

                const process = new AdbSubprocessShellProtocol(socket);
                const stdoutReader = process.stdout.getReader();
                const stderrReader = process.stderr.getReader();

                await expect(stdoutReader.read()).resolves.toEqual({
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                });
                await expect(stderrReader.read()).resolves.toEqual({
                    done: false,
                    value: new Uint8Array([4, 5, 6]),
                });

                closed.resolve();

                await expect(stdoutReader.read()).resolves.toEqual({
                    done: true,
                });
                await expect(stderrReader.read()).resolves.toEqual({
                    done: true,
                });
                await expect(process.exit).resolves.toBe(42);
            });
        });

        describe("with no `exit` message", () => {
            it("should close `stdout`, `stderr` and reject `exit`", async () => {
                const [socket, closed] = createMockSocket((controller) => {
                    controller.close();
                });

                const process = new AdbSubprocessShellProtocol(socket);
                const stdoutReader = process.stdout.getReader();
                const stderrReader = process.stderr.getReader();

                await expect(stdoutReader.read()).resolves.toEqual({
                    done: false,
                    value: new Uint8Array([1, 2, 3]),
                });
                await expect(stderrReader.read()).resolves.toEqual({
                    done: false,
                    value: new Uint8Array([4, 5, 6]),
                });

                closed.resolve();

                await Promise.all([
                    expect(stdoutReader.read()).resolves.toEqual({
                        done: true,
                    }),
                    expect(stderrReader.read()).resolves.toEqual({
                        done: true,
                    }),
                    expect(process.exit).rejects.toThrow(),
                ]);
            });
        });
    });

    describe("`socket.readable` invalid data", () => {
        it("should error `stdout`, `stderr` and reject `exit`", async () => {
            const [socket, closed] = createMockSocket(async (controller) => {
                controller.enqueue(new Uint8Array([7, 8, 9]));
                controller.close();
            });

            const process = new AdbSubprocessShellProtocol(socket);
            const stdoutReader = process.stdout.getReader();
            const stderrReader = process.stderr.getReader();

            await expect(stdoutReader.read()).resolves.toEqual({
                done: false,
                value: new Uint8Array([1, 2, 3]),
            });
            await expect(stderrReader.read()).resolves.toEqual({
                done: false,
                value: new Uint8Array([4, 5, 6]),
            });

            closed.resolve();

            await Promise.all([
                expect(stdoutReader.read()).rejects.toThrow(),
                expect(stderrReader.read()).rejects.toThrow(),
                expect(process.exit).rejects.toThrow(),
            ]);
        });
    });
});
