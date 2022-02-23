import { PromiseResolver } from "@yume-chan/async";
import type { Adb } from "../../adb";
import type { AdbSocket } from "../../socket";
import { ReadableStream, ReadableStreamDefaultController, WrapReadableStream } from "../../stream";
import type { AdbSubprocessProtocol } from "./types";

/**
 * The legacy shell
 *
 * Features:
 * * `stderr`: No
 * * `exit` exit code: No
 * * `resize`: No
 */
export class AdbNoneSubprocessProtocol implements AdbSubprocessProtocol {
    public static isSupported() { return true; }

    public static async spawn(adb: Adb, command: string) {
        return new AdbNoneSubprocessProtocol(await adb.createSocket(`shell:${command}`));
    }

    private readonly socket: AdbSocket;

    // Legacy shell forwards all data to stdin.
    public get stdin() { return this.socket.writable; }

    private _stdout: ReadableStream<Uint8Array>;
    // Legacy shell doesn't support splitting output streams.
    public get stdout() { return this._stdout; }

    // `stderr` of Legacy shell is always empty.
    private _stderr: ReadableStream<Uint8Array>;
    public get stderr() { return this._stderr; }

    private _exit = new PromiseResolver<number>();
    public get exit() { return this._exit.promise; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;

        let stderrController!: ReadableStreamDefaultController<Uint8Array>;
        this._stderr = new ReadableStream<Uint8Array>({
            start(controller) {
                stderrController = controller;
            },
        });

        this._stdout = new WrapReadableStream<Uint8Array, ReadableStream<Uint8Array>, undefined>({
            async start() {
                return {
                    readable: socket.readable,
                    state: undefined,
                };
            },
            close: async () => {
                // Close `stderr` on exit.
                stderrController.close();

                this._exit.resolve(0);
            }
        });
    }

    public resize() {
        // Not supported
    }

    public kill() {
        return this.socket.close();
    }
}
