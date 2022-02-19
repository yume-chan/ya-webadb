// cspell: ignore bugreport
// cspell: ignore bugreportz

import { AdbCommandBase, AdbShellSubprocessProtocol, DecodeUtf8Stream, ReadableStream, SplitLineStream, WrapReadableStream } from "@yume-chan/adb";

export interface BugReportVersion {
    major: number;
    minor: number;
}

export class BugReportZ extends AdbCommandBase {
    public static VERSION_REGEX = /(\d+)\.(\d+)/;

    public static BEGIN_REGEX = /BEGIN:(.*)/;

    public static PROGRESS_REGEX = /PROGRESS:(.*)\/(.*)/;

    public static OK_REGEX = /OK:(.*)/;

    public static FAIL_REGEX = /FAIL:(.*)/;

    /**
     * Retrieve the version of bugreportz.
     *
     * @returns a `BugReportVersion` object, or `undefined` if `bugreportz` is not available.
     */
    public async version(): Promise<BugReportVersion | undefined> {
        // bugreportz requires shell protocol
        if (!AdbShellSubprocessProtocol.isSupported(this.adb)) {
            return undefined;
        }

        const { stderr, exitCode } = await this.adb.subprocess.spawnAndWait(['bugreportz', '-v']);
        if (exitCode !== 0 || stderr === '') {
            return undefined;
        }

        const match = stderr.match(BugReportZ.VERSION_REGEX);
        if (!match) {
            return undefined;
        }

        return {
            major: parseInt(match[1]!, 10),
            minor: parseInt(match[2]!, 10),
        };
    }

    public supportStream(version: BugReportVersion): boolean {
        return version.major > 1 || version.minor >= 2;
    }

    public stream(): ReadableStream<ArrayBuffer> {
        return new WrapReadableStream<ArrayBuffer, ReadableStream<ArrayBuffer>, undefined>({
            start: async () => {
                const process = await this.adb.subprocess.spawn(['bugreportz', '-s']);
                return {
                    readable: process.stdout,
                    state: undefined,
                };
            },
        });
    }

    public supportProgress(version: BugReportVersion): boolean {
        return version.major > 1 || version.minor >= 1;
    }

    /**
     * Create a zipped bugreport file.
     *
     * Compare to `stream`, this method will write the output on device. You can pull it using sync protocol.
     *
     * @param onProgress Progress callback. Only specify this if `supportsProgress()` returns `true`.
     * @returns The path of the bugreport file.
     */
    public async generate(onProgress?: (progress: string, total: string) => void): Promise<string> {
        const process = await this.adb.subprocess.spawn([
            'bugreportz',
            ...(onProgress ? ['-p'] : []),
        ]);

        let filename: string | undefined;
        let error: string | undefined;

        await process.stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new SplitLineStream())
            .pipeTo(new WritableStream({
                write(line) {
                    // (Not 100% sure) `BEGIN:` and `PROGRESS:` only appear when `-p` is specified.
                    let match = line.match(BugReportZ.PROGRESS_REGEX);
                    if (match) {
                        onProgress?.(match[1]!, match[2]!);
                    }

                    match = line.match(BugReportZ.BEGIN_REGEX);
                    if (match) {
                        filename = match[1]!;
                    }

                    match = line.match(BugReportZ.OK_REGEX);
                    if (match) {
                        filename = match[1];
                    }

                    match = line.match(BugReportZ.FAIL_REGEX);
                    if (match) {
                        // Don't report error now
                        // We want to gather all output.
                        error = match[1];

                    }
                }
            }));

        if (error) {
            throw new Error(error);
        }

        if (!filename) {
            throw new Error('bugreportz did not return file name');
        }

        // Design choice: we don't automatically pull the file to avoid more dependency on `@yume-chan/adb`
        return filename;
    }
}

export class BugReport extends AdbCommandBase {
    public generate(): ReadableStream<string> {
        return new WrapReadableStream<string, ReadableStream<string>, undefined>({
            start: async () => {
                const process = await this.adb.subprocess.spawn(['bugreport']);
                return {
                    readable: process.stdout
                        .pipeThrough(new DecodeUtf8Stream()),
                    state: undefined,
                };
            }
        });
    }
}
