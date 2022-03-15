import type { Adb } from "../../adb.js";
import type { AdbSocket } from "../../socket/index.js";
import { DuplexStreamFactory, type ReadableStream } from "../../stream/index.js";
import type { AdbSubprocessProtocol } from "./types.js";

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

    private _exit: Promise<number>;
    public get exit() { return this._exit; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;

        const factory = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: async () => {
                await this.socket.close();
            },
        });

        this._stdout = factory.createWrapReadable(this.socket.readable);
        this._stderr = factory.createReadable();
        this._exit = factory.closed.then(() => 0);
    }

    public resize() {
        // Not supported
    }

    public kill() {
        return this.socket.close();
    }
}
