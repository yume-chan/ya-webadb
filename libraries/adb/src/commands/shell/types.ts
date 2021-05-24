import type { Event } from "@yume-chan/event";
import type { ValueOrPromise } from "@yume-chan/struct";
import type { Adb } from "../../adb";
import type { AdbSocket } from "../../socket";

export interface AdbShell {
    /**
     * Notifies that new data has been written into the `stdout` stream.
     */
    readonly onStdout: Event<ArrayBuffer>;

    /**
     * Notifies that new data has been written into the `stderr` stream.
     *
     * Some `AdbShell`s may not support separate output streams
     * and will always fire the `onStdout` event instead.
     */
    readonly onStderr: Event<ArrayBuffer>;

    /**
     * Notifies that the current process has exited.
     *
     * The event arg is the exit code.
     * Some `AdbShell`s may not support returning exit code and will always return `0` instead.
     */
    readonly onExit: Event<number>;

    /**
     * Writes raw PTY data into the `stdin` stream.
     */
    write(data: ArrayBuffer): Promise<void>;

    /**
     * Resizes the current shell.
     *
     * Some `AdbShell`s may not support resizing and will always ignore calls to this method.
     */
    resize(rows: number, cols: number): ValueOrPromise<void>;

    /**
     * Kills the current process.
     */
    kill(): ValueOrPromise<void>;
}

export interface AdbShellConstructor {
    /** Returns `true` if the `adb` instance supports this shell */
    isSupported(adb: Adb): ValueOrPromise<boolean>;

    /** Creates a new `AdbShell` using the specified `Adb` and `command` */
    spawn(adb: Adb, command: string): ValueOrPromise<AdbShell>;

    /** Creates a new `AdbShell` by attaching to an exist `AdbSocket` */
    new(socket: AdbSocket): AdbShell;
}
