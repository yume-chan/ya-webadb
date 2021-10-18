import { EventEmitter } from "@yume-chan/event";
import type { Adb } from "../../adb";
import type { AdbSocket } from "../../socket";
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
    static isSupported() { return true; }

    static async spawn(adb: Adb, command: string) {
        return new AdbLegacyShell(await adb.createSocket(`shell:${command}`));
    }

    private readonly socket: AdbSocket;

    private readonly stdoutEvent = new EventEmitter<ArrayBuffer>();
    get onStdout() { return this.stdoutEvent.event; }

    private readonly stderrEvent = new EventEmitter<ArrayBuffer>();
    get onStderr() { return this.stderrEvent.event; }

    private readonly exitEvent = new EventEmitter<number>();
    get onExit() { return this.exitEvent.event; }

    constructor(socket: AdbSocket) {
        this.socket = socket;
        this.socket.onData(this.handleData, this);
        this.socket.onClose(this.handleExit, this);
    }

    private handleData(data: ArrayBuffer) {
        // Legacy shell doesn't support splitting output streams.
        this.stdoutEvent.fire(data);
    }

    private handleExit() {
        // Legacy shell doesn't support returning exit code.
        this.exitEvent.fire(0);
    }

    async write(data: ArrayBuffer) {
        this.socket.write(data);
    }

    resize() {
        // Not supported
    }

    kill() {
        return this.socket.close();
    }
}
