import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    AbortSignal,
    MaybeConsumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import {
    ConcatBufferStream,
    ConcatStringStream,
    TextDecoderStream,
} from "@yume-chan/stream-extra";

import { splitCommand } from "../utils.js";

export interface AdbNoneProtocolProcess {
    get stdin(): WritableStream<MaybeConsumable<Uint8Array>>;

    /**
     * Mix of stdout and stderr
     */
    get output(): ReadableStream<Uint8Array>;

    get exited(): Promise<void>;

    kill(): MaybePromiseLike<void>;
}

export class AdbNoneProtocolSpawner {
    readonly #spawn: (
        command: readonly string[],
        signal: AbortSignal | undefined,
    ) => Promise<AdbNoneProtocolProcess>;

    constructor(
        spawn: (
            command: readonly string[],
            signal: AbortSignal | undefined,
        ) => Promise<AdbNoneProtocolProcess>,
    ) {
        this.#spawn = spawn;
    }

    spawn(
        command: string | readonly string[],
        signal?: AbortSignal,
    ): Promise<AdbNoneProtocolProcess> {
        signal?.throwIfAborted();

        if (typeof command === "string") {
            command = splitCommand(command);
        }

        return this.#spawn(command, signal);
    }

    async spawnWait(command: string | readonly string[]): Promise<Uint8Array> {
        const process = await this.spawn(command);
        return await process.output.pipeThrough(new ConcatBufferStream());
    }

    async spawnWaitText(command: string | readonly string[]): Promise<string> {
        const process = await this.spawn(command);
        return await process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream());
    }
}
