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

import { NOOP } from "../../../utils/no-op.js";
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
    #spawn: (command: string[]) => Promise<AdbNoneProtocolProcess>;

    constructor(spawn: (command: string[]) => Promise<AdbNoneProtocolProcess>) {
        this.#spawn = spawn;
    }

    async spawn(
        command: string | string[],
        signal?: AbortSignal,
    ): Promise<AdbNoneProtocolProcess> {
        if (typeof command === "string") {
            command = splitCommand(command);
        }

        const process = await this.#spawn(command);

        if (signal) {
            if (signal.aborted) {
                void process.exited.catch(NOOP);
                await process.kill();
                throw signal.reason;
            }

            const handleAbort = () => void process.kill();
            signal.addEventListener("abort", handleAbort);
            void process.exited.finally(() =>
                signal.removeEventListener("abort", handleAbort),
            );
        }

        return process;
    }

    async spawnWait(command: string | string[]): Promise<Uint8Array> {
        const process = await this.spawn(command);
        return await process.output.pipeThrough(new ConcatBufferStream());
    }

    async spawnWaitText(command: string | string[]): Promise<string> {
        const process = await this.spawn(command);
        return await process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream());
    }
}
