import type {
    Consumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";

import type { Adb } from "../../../adb.js";
import type { AdbSocket } from "../../../socket/index.js";

export interface AdbSubprocessProtocol {
    /**
     * A WritableStream that writes to the `stdin` stream.
     */
    readonly stdin: WritableStream<Consumable<Uint8Array>>;

    /**
     * The `stdout` stream of the process.
     */
    readonly stdout: ReadableStream<Uint8Array>;

    /**
     * The `stderr` stream of the process.
     *
     * Note: Some `AdbSubprocessProtocol` doesn't separate `stdout` and `stderr`,
     * All output will be sent to `stdout`.
     */
    readonly stderr: ReadableStream<Uint8Array>;

    /**
     * A `Promise` that resolves to the exit code of the process.
     *
     * Note: Some `AdbSubprocessProtocol` doesn't support exit code,
     * They will always resolve it with `0`.
     */
    readonly exit: Promise<number>;

    /**
     * Resizes the current shell.
     *
     * Some `AdbSubprocessProtocol`s may not support resizing
     * and will ignore calls to this method.
     */
    resize(rows: number, cols: number): ValueOrPromise<void>;

    /**
     * Kills the current process.
     */
    kill(): ValueOrPromise<void>;
}

export interface AdbSubprocessProtocolConstructor {
    /** Returns `true` if the `adb` instance supports this shell */
    isSupported(adb: Adb): ValueOrPromise<boolean>;

    /** Spawns an executable in PTY (interactive) mode. */
    pty(adb: Adb, command: string): ValueOrPromise<AdbSubprocessProtocol>;

    /** Spawns an executable and pipe the output. */
    raw(adb: Adb, command: string): ValueOrPromise<AdbSubprocessProtocol>;

    /** Creates a new `AdbShell` by attaching to an exist `AdbSocket` */
    new (socket: AdbSocket): AdbSubprocessProtocol;
}
