import type { Adb } from "../../adb";
import type { AdbSocket } from "../../socket";
import { ReadableStream } from "../../utils";
import type { AdbShell } from "./types";

/**
 * The legacy shell
 *
 * Features:
 * * `onStderr`: No
 * * `onExit` exit code: No
 * * `resize`: No
 */
export class AdbLegacyShell implements AdbShell {
    public static isSupported() { return true; }

    public static async spawn(adb: Adb, command: string) {
        return new AdbLegacyShell(await adb.createSocket(`shell:${command}`));
    }

    private readonly socket: AdbSocket;

    // Legacy shell forwards all data to stdin.
    public get stdin() { return this.socket.writable; }

    private _stdout: ReadableStream<ArrayBuffer>;
    // Legacy shell doesn't support splitting output streams.
    public get stdout() { return this._stdout; }

    // `stderr` of Legacy shell is always empty.
    public readonly stderr = new ReadableStream({});

    private _exit: Promise<number>;
    public get exit() { return this._exit; }

    public constructor(socket: AdbSocket) {
        this.socket = socket;
        let exit;
        [this._stdout, exit] = this.socket.readable.tee();
        this._exit = exit.getReader().closed.then(() => 0);
    }

    public resize() {
        // Not supported
    }

    public kill() {
        return this.socket.close();
    }
}
