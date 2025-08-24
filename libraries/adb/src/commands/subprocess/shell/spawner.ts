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

export interface AdbShellProtocolProcess {
    get stdin(): WritableStream<MaybeConsumable<Uint8Array>>;

    get stdout(): ReadableStream<Uint8Array>;
    get stderr(): ReadableStream<Uint8Array>;

    get exited(): Promise<number>;

    kill(): MaybePromiseLike<void>;
}

export type AdbShellProtocolSpawner = (
    command: string | readonly string[],
    signal?: AbortSignal,
) => Promise<AdbShellProtocolProcess> &
    AdbSubprocessSpawner.Wait<
        AdbShellProtocolSpawner.WaitResult<Uint8Array>,
        AdbShellProtocolSpawner.WaitResult<string>
    >;

export namespace AdbShellProtocolSpawner {
    export interface WaitResult<T> {
        stdout: T;
        stderr: T;
        exitCode: number;
    }
}

export function adbShellProtocolSpawner(
    spawn: (
        command: readonly string[],
        signal: AbortSignal | undefined,
    ) => Promise<AdbShellProtocolProcess>,
): AdbShellProtocolSpawner {
    return (command, signal) => {
        signal?.throwIfAborted();

        if (typeof command === "string") {
            command = splitCommand(command);
        }

        const processPromise = spawn(
            command,
            signal,
        ) as Promise<AdbShellProtocolProcess> &
            AdbSubprocessSpawner.Wait<
                AdbShellProtocolSpawner.WaitResult<Uint8Array>,
                AdbShellProtocolSpawner.WaitResult<string>
            >;

        processPromise.wait = (options) => {
            const waitPromise = processPromise.then(async (process) => {
                const [, stdout, stderr, exitCode] = await Promise.all([
                    options?.stdin?.pipeTo(process.stdin),
                    process.stdout.pipeThrough(new ToArrayStream()),
                    process.stderr.pipeThrough(new ToArrayStream()),
                    process.exited,
                ]);
                return {
                    stdout,
                    stderr,
                    exitCode,
                } satisfies AdbShellProtocolSpawner.WaitResult<Uint8Array[]>;
            });

            return createLazyPromise(
                async () => {
                    const { stdout, stderr, exitCode } = await waitPromise;

                    return {
                        stdout: concatUint8Arrays(stdout),
                        stderr: concatUint8Arrays(stderr),
                        exitCode,
                    };
                },
                {
                    async toString() {
                        const { stdout, stderr, exitCode } = await waitPromise;

                        return {
                            stdout: decodeUtf8Chunked(stdout),
                            stderr: decodeUtf8Chunked(stderr),
                            exitCode,
                        };
                    },
                },
            );
        };

        return processPromise;
    };
}
