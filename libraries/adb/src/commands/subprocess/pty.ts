import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    MaybeConsumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";

export interface AdbPtyProcess<TExitCode> {
    get input(): WritableStream<MaybeConsumable<Uint8Array>>;
    get output(): ReadableStream<Uint8Array>;
    get exited(): Promise<TExitCode>;

    sigint(): Promise<void>;
    kill(): MaybePromiseLike<void>;
}
