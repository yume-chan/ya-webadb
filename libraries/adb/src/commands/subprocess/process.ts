import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    MaybeConsumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";

export interface Process {
    /**
     * A WritableStream that writes to the `stdin` stream.
     */
    readonly stdin: WritableStream<MaybeConsumable<Uint8Array>>;

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
    readonly exited: Promise<number>;

    /**
     * Resizes the current shell.
     *
     * Some `AdbSubprocessProtocol`s may not support resizing
     * and will ignore calls to this method.
     */
    resize(rows: number, cols: number): MaybePromiseLike<void>;

    /**
     * Kills the current process.
     */
    kill(): MaybePromiseLike<void>;
}
