// cspell: ignore logcat

import { AdbCommandBase, AdbSubprocessNoneProtocol, BufferedStream, BufferedStreamEndedError, DecodeUtf8Stream, ReadableStream, SplitLineStream, WritableStream } from "@yume-chan/adb";
import Struct, { StructAsyncDeserializeStream } from "@yume-chan/struct";

// `adb logcat` is an alias to `adb shell logcat`
// so instead of adding to core library, it's implemented here

// https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/include/android/log.h;l=141;drc=82b5738732161dbaafb2e2f25cce19cd26b9157d
export enum LogId {
    All = -1,
    Main,
    Radio,
    Events,
    System,
    Crash,
    Stats,
    Security,
    Kernel,
}

export enum LogPriority {
    Unknown,
    Default,
    Verbose,
    Info,
    Warn,
    Error,
    Fatal,
    Silent,
}

export interface LogcatOptions {
    pid?: number;
    ids?: LogId[];
}

const NANOSECONDS_PER_SECOND = BigInt(1e9);

// https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/include/log/log_read.h;l=39;drc=82b5738732161dbaafb2e2f25cce19cd26b9157d
export const LoggerEntry =
    new Struct({ littleEndian: true })
        .uint16('payloadSize')
        .uint16('headerSize')
        .int32('pid')
        .uint32('tid')
        .uint32('second')
        .uint32('nanoseconds')
        .uint32('logId')
        .uint32('uid')
        .extra({
            get timestamp() {
                return BigInt(this.second) * NANOSECONDS_PER_SECOND + BigInt(this.nanoseconds);
            },
        });

export type LoggerEntry = typeof LoggerEntry['TDeserializeResult'];

export interface LogMessage extends LoggerEntry {
    priority: LogPriority;
    payload: Uint8Array;
}

export async function deserializeLogMessage(stream: StructAsyncDeserializeStream): Promise<LogMessage> {
    const entry = await LoggerEntry.deserialize(stream);
    if (entry.headerSize !== LoggerEntry.size) {
        await stream.read(entry.headerSize - LoggerEntry.size);
    }
    const priority = (await stream.read(1))[0] as LogPriority;
    const payload = await stream.read(entry.payloadSize - 1);
    (entry as any).priority = priority;
    (entry as any).payload = payload;
    return entry as LogMessage;
}

export interface LogSize {
    id: LogId;
    size: number;
    readable?: number;
    consumed: number;
    maxEntrySize: number;
    maxPayloadSize: number;
}

export class Logcat extends AdbCommandBase {
    public static logIdToName(id: LogId): string {
        return LogId[id]!;
    }

    public static logNameToId(name: string): LogId {
        const key = name[0]!.toUpperCase() + name.substring(1);
        return (LogId as any)[key];
    }

    public static joinLogId(ids: LogId[]): string {
        return ids.map(id => Logcat.logIdToName(id)).join(',');
    }

    public static parseSize(value: number, multiplier: string): number {
        const MULTIPLIERS = ['', 'Ki', 'Mi', 'Gi'];
        return value * 1024 ** (MULTIPLIERS.indexOf(multiplier) || 0);
    }

    // TODO: logcat: Support output format before Android 10
    // ref https://android-review.googlesource.com/c/platform/system/core/+/748128
    public static readonly LOG_SIZE_REGEX_10 = /(.*): ring buffer is (.*) (.*)B \((.*) (.*)B consumed\), max entry is (.*) B, max payload is (.*) B/;

    // Android 11 added `readable` part
    // ref https://android-review.googlesource.com/c/platform/system/core/+/1390940
    public static readonly LOG_SIZE_REGEX_11 = /(.*): ring buffer is (.*) (.*)B \((.*) (.*)B consumed, (.*) (.*)B readable\), max entry is (.*) B, max payload is (.*) B/;

    public async getLogSize(ids?: LogId[]): Promise<LogSize[]> {
        const { stdout } = await this.adb.subprocess.spawn([
            'logcat',
            '-g',
            ...(ids ? ['-b', Logcat.joinLogId(ids)] : [])
        ]);

        const result: LogSize[] = [];
        await stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new SplitLineStream())
            .pipeTo(new WritableStream({
                write(chunk) {
                    let match = chunk.match(Logcat.LOG_SIZE_REGEX_11);
                    if (match) {
                        result.push({
                            id: Logcat.logNameToId(match[1]!),
                            size: Logcat.parseSize(Number.parseInt(match[2]!, 10), match[3]!),
                            readable: Logcat.parseSize(Number.parseInt(match[6]!, 10), match[7]!),
                            consumed: Logcat.parseSize(Number.parseInt(match[4]!, 10), match[5]!),
                            maxEntrySize: parseInt(match[8]!, 10),
                            maxPayloadSize: parseInt(match[9]!, 10),
                        });
                    }

                    match = chunk.match(Logcat.LOG_SIZE_REGEX_10);
                    if (match) {
                        result.push({
                            id: Logcat.logNameToId(match[1]!),
                            size: Logcat.parseSize(Number.parseInt(match[2]!, 10), match[3]!),
                            consumed: Logcat.parseSize(Number.parseInt(match[4]!, 10), match[5]!),
                            maxEntrySize: parseInt(match[6]!, 10),
                            maxPayloadSize: parseInt(match[7]!, 10),
                        });
                    }
                },
            }));

        return result;
    }

    public async clear(ids?: LogId[]) {
        await this.adb.subprocess.spawnAndWait([
            'logcat',
            '-c',
            ...(ids ? ['-b', Logcat.joinLogId(ids)] : []),
        ]);
    }

    public binary(options?: LogcatOptions): ReadableStream<LogMessage> {
        let bufferedStream: BufferedStream;
        return new ReadableStream({
            start: async () => {
                const { stdout } = await this.adb.subprocess.spawn([
                    'logcat',
                    '-B',
                    ...(options?.pid ? ['--pid', options.pid.toString()] : []),
                    ...(options?.ids ? ['-b', Logcat.joinLogId(options.ids)] : [])
                ], {
                    // PERF: None protocol is 150% faster then Shell protocol
                    protocols: [AdbSubprocessNoneProtocol],
                });
                bufferedStream = new BufferedStream(stdout);
            },
            async pull(controller) {
                try {
                    const entry = await deserializeLogMessage(bufferedStream);
                    controller.enqueue(entry);
                } catch (e) {
                    if (e instanceof BufferedStreamEndedError) {
                        controller.close();
                        return;
                    }

                    throw e;
                }
            },
            cancel() {
                bufferedStream.close();
            },
        });
    }
}
