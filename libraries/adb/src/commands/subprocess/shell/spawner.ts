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

export interface AdbShellProtocolProcess {
    get stdin(): WritableStream<MaybeConsumable<Uint8Array>>;

    get stdout(): ReadableStream<Uint8Array>;
    get stderr(): ReadableStream<Uint8Array>;

    get exited(): Promise<number>;

    kill(): MaybePromiseLike<void>;
}

export class AdbShellProtocolSpawner {
    readonly #spawn: (
        command: string[],
        signal: AbortSignal | undefined,
    ) => Promise<AdbShellProtocolProcess>;

    constructor(
        spawn: (
            command: string[],
            signal: AbortSignal | undefined,
        ) => Promise<AdbShellProtocolProcess>,
    ) {
        this.#spawn = spawn;
    }

    async spawn(
        command: string | string[],
        signal?: AbortSignal,
    ): Promise<AdbShellProtocolProcess> {
        signal?.throwIfAborted();

        if (typeof command === "string") {
            command = splitCommand(command);
        }

        const process = await this.#spawn(command, signal);

        if (signal?.aborted) {
            await process.kill();
            throw signal.reason;
        }

        return process;
    }

    async spawnWait(
        command: string | string[],
    ): Promise<AdbShellProtocolSpawner.WaitResult<Uint8Array>> {
        const process = await this.spawn(command);
        const [stdout, stderr, exitCode] = await Promise.all([
            process.stdout.pipeThrough(new ConcatBufferStream()),
            process.stderr.pipeThrough(new ConcatBufferStream()),
            process.exited,
        ]);
        return { stdout, stderr, exitCode };
    }

    async spawnWaitText(
        command: string | string[],
    ): Promise<AdbShellProtocolSpawner.WaitResult<string>> {
        const process = await this.spawn(command);
        const [stdout, stderr, exitCode] = await Promise.all([
            process.stdout
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new ConcatStringStream()),
            process.stderr
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new ConcatStringStream()),
            process.exited,
        ]);
        return { stdout, stderr, exitCode };
    }
}

export namespace AdbShellProtocolSpawner {
    export interface WaitResult<T> {
        stdout: T;
        stderr: T;
        exitCode: number;
    }
}
