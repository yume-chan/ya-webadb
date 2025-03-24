import type { AbortSignal } from "@yume-chan/stream-extra";
import {
    ConcatBufferStream,
    ConcatStringStream,
    TextDecoderStream,
} from "@yume-chan/stream-extra";

import { NOOP } from "../../utils/no-op.js";

import type { Process } from "./process.js";
import type { ProcessSpawner } from "./spawner.js";
import { splitCommand } from "./utils.js";

export interface ProcessResult {
    stdout: Uint8Array;
    stderr: Uint8Array;
    exitCode: number;
}

export interface ProcessTextResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export class ProcessHelper {
    #spawner: ProcessSpawner;
    get spawner() {
        return this.#spawner;
    }

    constructor(spawner: ProcessSpawner) {
        this.#spawner = spawner;
    }

    async spawn(
        command: string | string[],
        signal?: AbortSignal,
    ): Promise<Process> {
        if (typeof command === "string") {
            command = splitCommand(command);
        }

        const process = await this.#spawner.raw(command, signal);

        if (signal?.aborted) {
            void process.exited.catch(NOOP);
            await process.kill();
            throw signal.reason;
        }

        return process;
    }

    async shell(
        command: string | string[],
        signal?: AbortSignal,
    ): Promise<Process> {
        if (typeof command === "string") {
            command = splitCommand(command);
        }

        const process = await this.#spawner.pty(command, signal);

        if (signal?.aborted) {
            void process.exited.catch(NOOP);
            await process.kill();
            throw signal.reason;
        }

        return process;
    }

    async spawnWait(command: string | string[]): Promise<ProcessResult> {
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
    ): Promise<ProcessTextResult> {
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
