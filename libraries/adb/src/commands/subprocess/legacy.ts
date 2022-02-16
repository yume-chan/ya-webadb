import { PromiseResolver } from "@yume-chan/async";
import type { Adb } from "../../adb";
import type { AdbSocket } from "../../socket";
import { ReadableStream, TransformStream } from "../../utils";
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

    private _stdout: ReadableStream<ArrayBuffer>;
    // Legacy shell doesn't support splitting output streams.
    public get stdout() { return this._stdout; }

    // `stderr` of Legacy shell is always empty.
    private _stderr = new TransformStream<ArrayBuffer, ArrayBuffer>();
    public get stderr() { return this._stderr.readable; }

    private _exit = new PromiseResolver<number>();
    public get exit() { return this._exit.promise; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;
        this._stdout = this.socket.readable
            .pipeThrough(new TransformStream({
                flush: () => {
                    this._stderr.writable.close();
                    this._exit.resolve(0);
                },
            }));
    }

    public resize() {
        // Not supported
    }

    public kill() {
        return this.socket.close();
    }
}
