// cspell: ignore bugreport
// cspell: ignore bugreportz

import { AdbCommandBase, AdbShellSubprocessProtocol, decodeUtf8, TransformStream } from "@yume-chan/adb";

function* splitLines(text: string): Generator<string, void, void> {
    let start = 0;

    while (true) {
        const index = text.indexOf('\n', start);
        if (index === -1) {
            return;
        }

        const line = text.substring(start, index);
        yield line;

        start = index + 1;
    }
}

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

    public async stream(): Promise<ReadableStream<ArrayBuffer>> {
        const process = await this.adb.subprocess.spawn(['bugreportz', '-s']);
        return process.stdout;
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

        await process.stdout.pipeTo(new WritableStream({
            write(chunk) {
                const string = decodeUtf8(chunk);
                for (const line of splitLines(string)) {
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
    public async generate(): Promise<ReadableStream<string>> {
        const process = await this.adb.subprocess.spawn(['bugreport']);
        return process.stdout.pipeThrough(new TransformStream({
            transform(chunk, controller) {
                controller.enqueue(decodeUtf8(chunk));
            }
        }));
    }
}
