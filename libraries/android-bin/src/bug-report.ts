// cspell: ignore bugreport
// cspell: ignore bugreportz

import { AdbCommandBase, AdbShellProtocol, decodeUtf8, EventQueue, EventQueueEndedError } from "@yume-chan/adb";
import { once } from "@yume-chan/event";

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
        if (!AdbShellProtocol.isSupported(this.adb)) {
            return undefined;
        }

        const { stderr, exitCode } = await this.adb.childProcess.spawnAndWait(['bugreportz', '-v']);
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

    public async *stream(): AsyncGenerator<ArrayBuffer, void, void> {
        const process = await this.adb.childProcess.spawn(['bugreportz', '-s']);
        const queue = new EventQueue<ArrayBuffer>();
        process.onStdout(buffer => queue.enqueue(buffer));
        process.onExit(() => queue.end());
        try {
            while (true) {
                yield await queue.dequeue();
            }
        } catch (e) {
            if (e instanceof EventQueueEndedError) {
                return;
            }

            throw e;
        }
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
        const process = await this.adb.childProcess.spawn([
            'bugreportz',
            ...(onProgress ? ['-p'] : []),
        ]);

        let filename: string | undefined;
        let error: string | undefined;

        process.onStdout(buffer => {
            const string = decodeUtf8(buffer);
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
                    error = match[1];
                }
            }
        });

        await once(process.onExit);

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
    public async *generate(): AsyncGenerator<string, void, void> {
        const process = await this.adb.childProcess.spawn(['bugreport']);
        const queue = new EventQueue<ArrayBuffer>();
        process.onStdout(buffer => queue.enqueue(buffer));
        process.onExit(() => queue.end());
        try {
            while (true) {
                yield decodeUtf8(await queue.dequeue());
            }
        } catch (e) {
            if (e instanceof EventQueueEndedError) {
                return;
            }

            throw e;
        }
    }
}
