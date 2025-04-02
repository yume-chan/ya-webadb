// cspell: ignore bugreport
// cspell: ignore bugreportz

import type { Adb, AdbSync } from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";
import type { AbortSignal, ReadableStream } from "@yume-chan/stream-extra";
import {
    AbortController,
    PushReadableStream,
    SplitStringStream,
    TextDecoderStream,
    WrapReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";

export interface BugReportCapabilities {
    supportsBugReport: boolean;
    bugReportZVersion?: string | undefined;
    supportsBugReportZ: boolean;
    supportsBugReportZProgress: boolean;
    supportsBugReportZStream: boolean;
}

export interface BugReportZOptions {
    signal?: AbortSignal;
    /**
     * A callback that will be called when progress is updated.
     *
     * Specify `onProgress` when `supportsBugReportZProgress` is `false` will throw an error.
     */
    onProgress?: ((completed: string, total: string) => void) | undefined;
}

export class BugReport extends AdbServiceBase {
    static VERSION_REGEX: RegExp = /(\d+)\.(\d+)/;

    static BEGIN_REGEX: RegExp = /BEGIN:(.*)/;

    static PROGRESS_REGEX: RegExp = /PROGRESS:(.*)\/(.*)/;

    static OK_REGEX: RegExp = /OK:(.*)/;

    static FAIL_REGEX: RegExp = /FAIL:(.*)/;

    /**
     * Queries the device's bugreport capabilities.
     */
    static async queryCapabilities(adb: Adb): Promise<BugReport> {
        // bugreportz requires shell protocol
        if (!adb.subprocess.shellProtocol) {
            return new BugReport(adb, {
                supportsBugReport: true,
                bugReportZVersion: undefined,
                supportsBugReportZ: false,
                supportsBugReportZProgress: false,
                supportsBugReportZStream: false,
            });
        }

        const result = await adb.subprocess.shellProtocol.spawnWaitText([
            "bugreportz",
            "-v",
        ]);
        if (result.exitCode !== 0 || result.stderr === "") {
            return new BugReport(adb, {
                supportsBugReport: true,
                bugReportZVersion: undefined,
                supportsBugReportZ: false,
                supportsBugReportZProgress: false,
                supportsBugReportZStream: false,
            });
        }

        const match = result.stderr.match(BugReport.VERSION_REGEX);
        if (!match) {
            return new BugReport(adb, {
                supportsBugReport: true,
                bugReportZVersion: undefined,
                supportsBugReportZ: false,
                supportsBugReportZProgress: false,
                supportsBugReportZStream: false,
            });
        }

        const [major, minor] = match[0]
            .split(".")
            .map((x) => parseInt(x, 10)) as [number, number];
        return new BugReport(adb, {
            // Before BugReportZ version 1.2 (Android 12), BugReport was deprecated but still works.
            supportsBugReport: major === 1 && minor <= 1,
            bugReportZVersion: match[0],
            supportsBugReportZ: true,
            supportsBugReportZProgress: major > 1 || minor >= 1,
            supportsBugReportZStream: major > 1 || minor >= 2,
        });
    }

    #supportsBugReport: boolean;
    /**
     * Gets whether the device supports flat (text file, non-zipped) bugreport.
     *
     * Should be `true` for Android version <= 11.
     */
    get supportsBugReport(): boolean {
        return this.#supportsBugReport;
    }

    #bugReportZVersion: string | undefined;
    /**
     * Gets the version of BugReportZ.
     *
     * Will be `undefined` if BugReportZ is not supported.
     */
    get bugReportZVersion(): string | undefined {
        return this.#bugReportZVersion;
    }

    #supportsBugReportZ: boolean;
    /**
     * Gets whether the device supports zipped bugreport.
     *
     * Should be `true` for Android version >= 7.
     */
    get supportsBugReportZ(): boolean {
        return this.#supportsBugReportZ;
    }

    #supportsBugReportZProgress: boolean;
    /**
     * Gets whether the device supports progress report for zipped bugreport.
     *
     * Should be `true` for Android version >= 8.
     */
    get supportsBugReportZProgress(): boolean {
        return this.#supportsBugReportZProgress;
    }

    #supportsBugReportZStream: boolean;
    /**
     * Gets whether the device supports streaming zipped bugreport.
     *
     * Should be `true` for Android version >= 12.
     */
    get supportsBugReportZStream(): boolean {
        return this.#supportsBugReportZStream;
    }

    constructor(adb: Adb, capabilities: BugReportCapabilities) {
        super(adb);

        this.#supportsBugReport = capabilities.supportsBugReport;
        this.#bugReportZVersion = capabilities.bugReportZVersion;
        this.#supportsBugReportZ = capabilities.supportsBugReportZ;
        this.#supportsBugReportZProgress =
            capabilities.supportsBugReportZProgress;
        this.#supportsBugReportZStream = capabilities.supportsBugReportZStream;
    }

    /**
     * Creates a legacy, non-zipped bugreport file, or throws an error if `supportsBugReport` is `false`.
     *
     * @returns A flat (text file, non-zipped) bugreport.
     */
    bugReport(): ReadableStream<Uint8Array> {
        if (!this.#supportsBugReport) {
            throw new Error(
                "Flat (text file, non-zipped) bugreport is not supported.",
            );
        }

        return new WrapReadableStream(async () => {
            // https://cs.android.com/android/platform/superproject/+/master:frameworks/native/cmds/bugreport/bugreport.cpp;drc=9b73bf07d73dbab5b792632e1e233edbad77f5fd;bpv=0;bpt=0
            const process =
                await this.adb.subprocess.noneProtocol.spawn("bugreport");
            return process.output;
        });
    }

    /**
     * Creates a zipped bugreport file, or throws an error if `supportsBugReportZ` is `false`.
     *
     * Compare to `bugReportZStream`, this method will write the output to a file on device.
     * You can pull it later using sync protocol.
     *
     * @returns The path to the generated bugreport file on device filesystem.
     */
    async bugReportZ(options?: BugReportZOptions): Promise<string> {
        if (options?.signal?.aborted) {
            throw options?.signal.reason as Error;
        }

        if (!this.#supportsBugReportZ) {
            throw new Error("bugreportz is not supported");
        }

        const args = ["bugreportz"];
        if (options?.onProgress) {
            if (!this.#supportsBugReportZProgress) {
                throw new Error("bugreportz progress is not supported");
            }
            args.push("-p");
        }

        // `subprocess.shellProtocol` must be defined when `this.#supportsBugReportZ` is `true`
        const process = await this.adb.subprocess.shellProtocol!.spawn(args);

        options?.signal?.addEventListener("abort", () => {
            void process.kill();
        });

        let filename: string | undefined;
        let error: string | undefined;

        for await (const line of process.stdout
            .pipeThrough(new TextDecoderStream())
            // Each chunk should contain one or several full lines
            .pipeThrough(new SplitStringStream("\n"))) {
            // `BEGIN:` and `PROGRESS:` only appear when `-p` is specified.
            let match = line.match(BugReport.PROGRESS_REGEX);
            if (match) {
                options?.onProgress?.(match[1]!, match[2]!);
            }

            match = line.match(BugReport.BEGIN_REGEX);
            if (match) {
                filename = match[1]!;
            }

            match = line.match(BugReport.OK_REGEX);
            if (match) {
                filename = match[1];
            }

            match = line.match(BugReport.FAIL_REGEX);
            if (match) {
                // Don't report error now
                // We want to gather all output.
                error = match[1];
            }
        }

        if (error) {
            throw new Error(error);
        }

        if (!filename) {
            throw new Error("bugreportz did not return file name");
        }

        // Design choice: we don't automatically pull the file to avoid more dependency on `@yume-chan/adb`
        return filename;
    }

    /**
     * Creates a zipped bugreport file, or throws an error if `supportsBugReportZStream` is `false`.
     *
     * @returns The content of the generated bugreport file.
     */
    bugReportZStream(): ReadableStream<Uint8Array> {
        return new PushReadableStream(async (controller) => {
            const process = await this.adb.subprocess.shellProtocol!.spawn([
                "bugreportz",
                "-s",
            ]);
            process.stdout
                .pipeTo(
                    new WritableStream({
                        async write(chunk) {
                            await controller.enqueue(chunk);
                        },
                    }),
                )
                .catch((e) => {
                    controller.error(e);
                });
            process.stderr
                .pipeThrough(new TextDecoderStream())
                .pipeTo(
                    new WritableStream({
                        write(chunk) {
                            controller.error(new Error(chunk));
                        },
                    }),
                )
                .catch((e) => {
                    controller.error(e);
                });
            await process.exited;
        });
    }

    /**
     * Automatically choose the best bugreport method.
     *
     * * If `supportsBugReportZStream` is `true`, this method will return a stream of zipped bugreport.
     * * If `supportsBugReportZ` is `true`, this method will return a stream of zipped bugreport, and will delete the file on device after the stream is closed.
     * * If `supportsBugReport` is `true`, this method will return a stream of flat bugreport.
     *
     * @param onProgress
     * If `supportsBugReportZStream` is `false` and `supportsBugReportZProgress` is `true`,
     * this callback will be called when progress is updated.
     */
    automatic(onProgress?: (completed: string, total: string) => void): {
        type: "bugreport" | "bugreportz";
        stream: ReadableStream<Uint8Array>;
    } {
        if (this.#supportsBugReportZStream) {
            return { type: "bugreportz", stream: this.bugReportZStream() };
        }

        if (this.#supportsBugReportZ) {
            let path: string | undefined;
            let sync: AdbSync | undefined;
            const controller = new AbortController();
            const cleanup = async () => {
                controller.abort();
                await sync?.dispose();
                if (path) {
                    await this.adb.rm(path);
                }
            };

            return {
                type: "bugreportz",
                stream: new WrapReadableStream({
                    start: async () => {
                        path = await this.bugReportZ({
                            signal: controller.signal,
                            onProgress: this.#supportsBugReportZProgress
                                ? onProgress
                                : undefined,
                        });
                        sync = await this.adb.sync();
                        return sync.read(path);
                    },
                    cancel: cleanup,
                    close: cleanup,
                }),
            };
        }

        return { type: "bugreport", stream: this.bugReport() };
    }
}
