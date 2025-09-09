import type { MaybePromiseLike } from "@yume-chan/async";
import type {
    AbortSignal,
    MaybeConsumable,
    ReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import { concatUint8Arrays } from "@yume-chan/stream-extra";

import type { AdbSubprocessSpawner } from "../types.js";
import {
    createLazyPromise,
    decodeUtf8Chunked,
    splitCommand,
    ToArrayStream,
} from "../utils.js";

export interface AdbNoneProtocolProcess {
    get stdin(): WritableStream<MaybeConsumable<Uint8Array>>;

    /**
     * Mix of stdout and stderr
     */
    get output(): ReadableStream<Uint8Array>;

    get exited(): Promise<void>;

    kill(): MaybePromiseLike<void>;
}

export type AdbNoneProtocolSpawner = (
    command: string | readonly string[],
    signal?: AbortSignal,
) => Promise<AdbNoneProtocolProcess> &
    AdbSubprocessSpawner.Wait<Uint8Array, string>;

export function adbNoneProtocolSpawner(
    spawn: (
        command: readonly string[],
        signal: AbortSignal | undefined,
    ) => Promise<AdbNoneProtocolProcess>,
): AdbNoneProtocolSpawner {
    return (command, signal) => {
        signal?.throwIfAborted();

        if (typeof command === "string") {
            command = splitCommand(command);
        }

        const processPromise = spawn(
            command,
            signal,
        ) as Promise<AdbNoneProtocolProcess> &
            AdbSubprocessSpawner.Wait<Uint8Array, string>;

        processPromise.wait = (options) => {
            const waitPromise = processPromise.then(async (process) => {
                const [, output] = await Promise.all([
                    options?.stdin?.pipeTo(process.stdin),
                    process.output.pipeThrough(new ToArrayStream()),
                ]);
                return output;
            });

            return createLazyPromise(
                async () => {
                    const chunks = await waitPromise;
                    return concatUint8Arrays(chunks);
                },
                {
                    async toString() {
                        const chunks = await waitPromise;
                        return decodeUtf8Chunked(chunks);
                    },
                },
            );
        };

        return processPromise;
    };
}
