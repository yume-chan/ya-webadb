import type { Adb } from "../../../adb.js";
import type { AdbSocket } from "../../../socket/index.js";
import { DuplexStreamFactory, ReadableStream } from "../../../stream/index.js";
import type { AdbSubprocessProtocol } from "./types.js";

/**
 * The legacy shell
 *
 * Features:
 * * `stderr`: No
 * * `exit` exit code: No
 * * `resize`: No
 */
export class AdbSubprocessNoneProtocol implements AdbSubprocessProtocol {
    public static isSupported() { return true; }

    public static async pty(adb: Adb, command: string) {
        return new AdbSubprocessNoneProtocol(await adb.createSocket(`shell:${command}`));
    }

    public static async raw(adb: Adb, command: string) {
        // `shell,raw:${command}` also triggers raw mode,
        // But is not supported before Android 7.
        return new AdbSubprocessNoneProtocol(await adb.createSocket(`exec:${command}`));
    }

    private readonly socket: AdbSocket;

    private readonly duplex: DuplexStreamFactory<Uint8Array, Uint8Array>;

    // Legacy shell forwards all data to stdin.
    public get stdin() { return this.socket.writable; }

    private _stdout: ReadableStream<Uint8Array>;
    /**
     * Legacy shell mixes stdout and stderr.
     */
    public get stdout() { return this._stdout; }

    private _stderr: ReadableStream<Uint8Array>;
    /**
     * `stderr` will always be empty.
     */
    public get stderr() { return this._stderr; }

    private _exit: Promise<number>;
    public get exit() { return this._exit; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;

        this.duplex = new DuplexStreamFactory<Uint8Array, Uint8Array>({
            close: async () => {
                await this.socket.close();
            },
        });

        this._stdout = this.duplex.wrapReadable(this.socket.readable);
        this._stderr = this.duplex.wrapReadable(new ReadableStream());
        this._exit = this.duplex.closed.then(() => 0);
    }

    public resize() {
        // Not supported
    }

    public kill() {
        return this.duplex.close();
    }
}
