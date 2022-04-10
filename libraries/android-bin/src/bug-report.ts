// cspell: ignore bugreport
// cspell: ignore bugreportz

import { AdbCommandBase, AdbSubprocessShellProtocol, DecodeUtf8Stream, PushReadableStream, ReadableStream, SplitLineStream, WrapReadableStream, WritableStream } from "@yume-chan/adb";

export interface BugReportZVersion {
    major: number;
    minor: number;

    supportProgress: boolean;
    supportStream: boolean;
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
    public async version(): Promise<BugReportZVersion | undefined> {
        // bugreportz requires shell protocol
        if (!AdbSubprocessShellProtocol.isSupported(this.adb)) {
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

        const major = parseInt(match[1]!, 10);
        const minor = parseInt(match[2]!, 10);
        return {
            major,
            minor,

            supportProgress: this.supportProgress(major, minor),
            supportStream: this.supportStream(major, minor),
        };
    }

    public supportProgress(major: number, minor: number): boolean {
        return major > 1 || minor >= 1;
    }

    /**
     * Create a zipped bugreport file.
     *
     * Compare to `stream`, this method will write the output to a file on device.
     * You can pull it later using sync protocol.
     *
     * @param onProgress Progress callback. Only specify this if `supportsProgress` is `true`.
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
            .pipeTo(new WritableStream<string>({
                write(line) {
                    // `BEGIN:` and `PROGRESS:` only appear when `-p` is specified.
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

    public supportStream(major: number, minor: number): boolean {
        return major > 1 || minor >= 2;
    }

    public stream(): ReadableStream<Uint8Array> {
        return new PushReadableStream(async (controller) => {
            const process = await this.adb.subprocess.spawn(['bugreportz', '-s']);
            process.stdout
                .pipeTo(new WritableStream({
                    async write(chunk) {
                        await controller.enqueue(chunk);
                    },
                }));
            process.stderr
                .pipeThrough(new DecodeUtf8Stream())
                .pipeTo(new WritableStream({
                    async write(chunk) {
                        controller.error(new Error(chunk));
                    }
                }));
            await process.exit;
            controller.close();
        });
    }
}

// https://cs.android.com/android/platform/superproject/+/master:frameworks/native/cmds/bugreport/bugreport.cpp;drc=9b73bf07d73dbab5b792632e1e233edbad77f5fd;bpv=0;bpt=0
export class BugReport extends AdbCommandBase {
    public generate(): ReadableStream<Uint8Array> {
        return new WrapReadableStream(async () => {
            const process = await this.adb.subprocess.spawn(['bugreport']);
            return process.stdout;
        });
    }
}
