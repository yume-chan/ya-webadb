// cspell: ignore logcat
// cspell: ignore usec

import { AdbCommandBase, AdbSubprocessNoneProtocol } from "@yume-chan/adb";
import type { ReadableStream } from "@yume-chan/stream-extra";
import {
    BufferedTransformStream,
    DecodeUtf8Stream,
    SplitStringStream,
    WrapReadableStream,
    WritableStream,
} from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";
import Struct, { decodeUtf8 } from "@yume-chan/struct";

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

// https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/include/android/log.h;l=73;drc=82b5738732161dbaafb2e2f25cce19cd26b9157d
export enum AndroidLogPriority {
    Unknown,
    Default,
    Verbose,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
    Silent,
}

// https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/logprint.cpp;l=140;drc=8dbf3b2bb6b6d1652d9797e477b9abd03278bb79
export const AndroidLogPriorityToCharacter: Record<AndroidLogPriority, string> =
    {
        [AndroidLogPriority.Unknown]: "?",
        [AndroidLogPriority.Default]: "?",
        [AndroidLogPriority.Verbose]: "V",
        [AndroidLogPriority.Debug]: "D",
        [AndroidLogPriority.Info]: "I",
        [AndroidLogPriority.Warn]: "W",
        [AndroidLogPriority.Error]: "E",
        [AndroidLogPriority.Fatal]: "F",
        [AndroidLogPriority.Silent]: "S",
    };

export enum LogcatFormat {
    Brief,
    Process,
    Tag,
    Thread,
    Raw,
    Time,
    ThreadTime,
    Long,
}

export interface LogcatFormatModifiers {
    microseconds?: boolean;
    nanoseconds?: boolean;
    printable?: boolean;
    year?: boolean;
    timezone?: boolean;
    epoch?: boolean;
    monotonic?: boolean;
    uid?: boolean;
    descriptive?: boolean;
}

export interface LogcatOptions {
    pid?: number;
    ids?: LogId[];
}

const NANOSECONDS_PER_SECOND = BigInt(1e9);

// https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/include/log/log_read.h;l=39;drc=82b5738732161dbaafb2e2f25cce19cd26b9157d
export const LoggerEntry = new Struct({ littleEndian: true })
    .uint16("payloadSize")
    .uint16("headerSize")
    .int32("pid")
    .uint32("tid")
    .uint32("seconds")
    .uint32("nanoseconds")
    .uint32("logId")
    .uint32("uid")
    .extra({
        get timestamp() {
            return (
                BigInt(this.seconds) * NANOSECONDS_PER_SECOND +
                BigInt(this.nanoseconds)
            );
        },
    });

export type LoggerEntry = (typeof LoggerEntry)["TDeserializeResult"];

// https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/logprint.cpp;drc=bbe77d66e7bee8bd1f0bc7e5492b5376b0207ef6;bpv=0
export interface AndroidLogEntry extends LoggerEntry {
    priority: AndroidLogPriority;
    tag: string;
    message: string;

    toString(format?: LogcatFormat, modifiers?: LogcatFormatModifiers): string;
}

function padZero(number: number, length: number) {
    return number.toString().padStart(length, "0");
}

function formatSeconds(seconds: number, modifiers: LogcatFormatModifiers) {
    if (modifiers.monotonic) {
        return padZero(seconds, 6);
    }

    if (modifiers.epoch) {
        return padZero(seconds, 19);
    }

    const date = new Date(seconds * 1000);

    const month = padZero(date.getMonth() + 1, 2);
    const day = padZero(date.getDate(), 2);
    const hour = padZero(date.getHours(), 2);
    const minute = padZero(date.getMinutes(), 2);
    const second = padZero(date.getSeconds(), 2);
    const result = `${month}-${day} ${hour}:${minute}:${second}`;

    if (modifiers.year) {
        const year = padZero(date.getFullYear(), 4);
        return `${year}-${result}`;
    }

    return result;
}

function formatNanoseconds(
    nanoseconds: number,
    modifiers: LogcatFormatModifiers
) {
    if (modifiers.nanoseconds) {
        return padZero(nanoseconds, 9);
    }

    if (modifiers.microseconds) {
        return padZero(nanoseconds / 1000, 6);
    }

    return padZero(nanoseconds / 1000000, 3);
}

function formatTimezone(seconds: number, modifiers: LogcatFormatModifiers) {
    if (!modifiers.timezone || modifiers.monotonic || modifiers.epoch) {
        return "";
    }

    const date = new Date(seconds * 1000);
    const offset = date.getTimezoneOffset();
    const sign = offset <= 0 ? "+" : "-";
    const absolute = Math.abs(offset);
    const hours = (absolute / 60) | 0;
    const minutes = absolute % 60;

    // prettier-ignore
    return ` ${
        sign
    }${
        hours.toString().padStart(2, "0")
    }:${
        minutes.toString().padStart(2, "0")
    }`;
}

function formatTime(
    seconds: number,
    nanoseconds: number,
    modifiers: LogcatFormatModifiers
) {
    const secondsString = formatSeconds(seconds, modifiers);
    const nanosecondsString = formatNanoseconds(nanoseconds, modifiers);
    const zoneString = formatTimezone(seconds, modifiers);
    return `${secondsString}.${nanosecondsString}${zoneString}`;
}

function formatUid(
    uid: number,
    modifiers: LogcatFormatModifiers,
    suffix: string
) {
    return modifiers.uid ? `${uid.toString().padStart(5)}${suffix}` : "";
}

function getFormatPrefix(
    entry: AndroidLogEntry,
    format: LogcatFormat,
    modifiers: LogcatFormatModifiers
) {
    // https://cs.android.com/android/platform/superproject/+/master:system/logging/liblog/logprint.cpp;l=1415;drc=8dbf3b2bb6b6d1652d9797e477b9abd03278bb79
    switch (format) {
        // TODO: implement other formats
        case LogcatFormat.Tag:
            // prettier-ignore
            return `${
                AndroidLogPriorityToCharacter[entry.priority]
            }/${
                entry.tag.padEnd(8)
            }: `;
        case LogcatFormat.Process:
            // prettier-ignore
            return `${
                AndroidLogPriorityToCharacter[entry.priority]
            }(${
                formatUid(entry.uid, modifiers, ":")
            }${
                entry.pid.toString().padStart(5)
            }) `;
        case LogcatFormat.Thread:
            // prettier-ignore
            return `${
                AndroidLogPriorityToCharacter[entry.priority]
            }(${
                formatUid(entry.uid, modifiers, ":")
            }${
                entry.pid.toString().padStart(5)
            }:${
                entry.tid.toString().padStart(5)
            }) `;
        case LogcatFormat.Raw:
            return "";
        case LogcatFormat.Time:
            // prettier-ignore
            return `${
                formatTime(entry.seconds, entry.nanoseconds, modifiers)
            } ${
                AndroidLogPriorityToCharacter[entry.priority]
            }/${
                entry.tag.padEnd(8)
            }(${
                formatUid(entry.uid, modifiers, ":")
            }${
                entry.pid.toString().padStart(5)
            }): `;
        case LogcatFormat.ThreadTime:
            // prettier-ignore
            return `${
                formatTime(entry.seconds, entry.nanoseconds, modifiers)
            } ${
                formatUid(entry.uid, modifiers, " ")
            }${
                entry.pid.toString().padStart(5)
            } ${
                entry.tid.toString().padStart(5)
            } ${
                AndroidLogPriorityToCharacter[entry.priority]
            } ${
                entry.tag.toString().padEnd(8)
            }: `;
        case LogcatFormat.Brief:
        default:
            // prettier-ignore
            return `${
                AndroidLogPriorityToCharacter[entry.priority]
            }/${
                entry.tag.padEnd(8)
            }(${
                formatUid(entry.uid, modifiers, ":")
            }${
                entry.pid.toString().padStart(5)
            }): `;
    }
}

function getFormatSuffix(entry: AndroidLogEntry, format: LogcatFormat) {
    switch (format) {
        case LogcatFormat.Process:
            return `  (${entry.tag})`;
        default:
            return "";
    }
}

function formatEntryWrapLine(
    entry: AndroidLogEntry,
    format: LogcatFormat,
    modifiers: LogcatFormatModifiers
) {
    const prefix = getFormatPrefix(entry, format, modifiers);
    const suffix = getFormatSuffix(entry, format);
    return (
        prefix + entry.message.replaceAll("\n", suffix + "\n" + prefix) + suffix
    );
}

function AndroidLogEntryToString(
    this: AndroidLogEntry,
    format: LogcatFormat = LogcatFormat.ThreadTime,
    modifiers: LogcatFormatModifiers = {}
) {
    switch (format) {
        case LogcatFormat.Long:
            // prettier-ignore
            return `[ ${
                formatTime(this.seconds, this.nanoseconds, modifiers)
            } ${
                formatUid(this.uid, modifiers, ":")
            }${
                this.pid.toString().padStart(5)
            }:${
                this.tid.toString().padStart(5)
            } ${
                AndroidLogPriorityToCharacter[this.priority]
            }/${
                this.tag.padEnd(8)
            } ]\n${
                this.message
            }\n`;
        default:
            return formatEntryWrapLine(this, format, modifiers);
    }
}

function findTagEnd(payload: Uint8Array) {
    for (const separator of [0, " ".charCodeAt(0), ":".charCodeAt(0)]) {
        const index = payload.indexOf(separator);
        if (index !== -1) {
            return index;
        }
    }

    const index = payload.findIndex((x) => x >= 0x7f);
    if (index !== -1) {
        return index;
    }

    return payload.length;
}

export async function deserializeAndroidLogEntry(
    stream: AsyncExactReadable
): Promise<AndroidLogEntry> {
    const entry = (await LoggerEntry.deserialize(stream)) as AndroidLogEntry;
    if (entry.headerSize !== LoggerEntry.size) {
        await stream.readExactly(entry.headerSize - LoggerEntry.size);
    }

    let payload = await stream.readExactly(entry.payloadSize);

    // https://cs.android.com/android/platform/superproject/+/master:system/logging/logcat/logcat.cpp;l=193-194;drc=bbe77d66e7bee8bd1f0bc7e5492b5376b0207ef6
    // TODO: payload for some log IDs are in binary format.
    entry.priority = payload[0] as AndroidLogPriority;

    payload = payload.subarray(1);
    const tagEnd = findTagEnd(payload);
    entry.tag = decodeUtf8(payload.subarray(0, tagEnd));
    entry.message =
        tagEnd < payload.length - 1
            ? decodeUtf8(payload.subarray(tagEnd + 1))
            : "";
    entry.toString = AndroidLogEntryToString;
    return entry;
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
        return LogId[key as keyof typeof LogId];
    }

    public static joinLogId(ids: LogId[]): string {
        return ids.map((id) => Logcat.logIdToName(id)).join(",");
    }

    public static parseSize(value: number, multiplier: string): number {
        const MULTIPLIERS = ["", "Ki", "Mi", "Gi"];
        return value * 1024 ** (MULTIPLIERS.indexOf(multiplier) || 0);
    }

    // TODO: logcat: Support output format before Android 10
    // ref https://android-review.googlesource.com/c/platform/system/core/+/748128
    public static readonly LOG_SIZE_REGEX_10 =
        /(.*): ring buffer is (.*) (.*)B \((.*) (.*)B consumed\), max entry is (.*) B, max payload is (.*) B/;

    // Android 11 added `readable` part
    // ref https://android-review.googlesource.com/c/platform/system/core/+/1390940
    public static readonly LOG_SIZE_REGEX_11 =
        /(.*): ring buffer is (.*) (.*)B \((.*) (.*)B consumed, (.*) (.*)B readable\), max entry is (.*) B, max payload is (.*) B/;

    public async getLogSize(ids?: LogId[]): Promise<LogSize[]> {
        const { stdout } = await this.adb.subprocess.spawn([
            "logcat",
            "-g",
            ...(ids ? ["-b", Logcat.joinLogId(ids)] : []),
        ]);

        const result: LogSize[] = [];
        await stdout
            .pipeThrough(new DecodeUtf8Stream())
            .pipeThrough(new SplitStringStream("\n"))
            .pipeTo(
                new WritableStream({
                    write(chunk) {
                        let match = chunk.match(Logcat.LOG_SIZE_REGEX_11);
                        if (match) {
                            result.push({
                                id: Logcat.logNameToId(match[1]!),
                                size: Logcat.parseSize(
                                    Number.parseInt(match[2]!, 10),
                                    match[3]!
                                ),
                                readable: Logcat.parseSize(
                                    Number.parseInt(match[6]!, 10),
                                    match[7]!
                                ),
                                consumed: Logcat.parseSize(
                                    Number.parseInt(match[4]!, 10),
                                    match[5]!
                                ),
                                maxEntrySize: parseInt(match[8]!, 10),
                                maxPayloadSize: parseInt(match[9]!, 10),
                            });
                            return;
                        }

                        match = chunk.match(Logcat.LOG_SIZE_REGEX_10);
                        if (match) {
                            result.push({
                                id: Logcat.logNameToId(match[1]!),
                                size: Logcat.parseSize(
                                    Number.parseInt(match[2]!, 10),
                                    match[3]!
                                ),
                                consumed: Logcat.parseSize(
                                    Number.parseInt(match[4]!, 10),
                                    match[5]!
                                ),
                                maxEntrySize: parseInt(match[6]!, 10),
                                maxPayloadSize: parseInt(match[7]!, 10),
                            });
                        }
                    },
                })
            );

        return result;
    }

    public async clear(ids?: LogId[]) {
        await this.adb.subprocess.spawnAndWait([
            "logcat",
            "-c",
            ...(ids ? ["-b", Logcat.joinLogId(ids)] : []),
        ]);
    }

    public binary(options?: LogcatOptions): ReadableStream<AndroidLogEntry> {
        return new WrapReadableStream(async () => {
            // TODO: make `spawn` return synchronously with streams pending
            // so it's easier to chain them.
            const { stdout } = await this.adb.subprocess.spawn(
                [
                    "logcat",
                    "-B",
                    ...(options?.pid ? ["--pid", options.pid.toString()] : []),
                    ...(options?.ids
                        ? ["-b", Logcat.joinLogId(options.ids)]
                        : []),
                ],
                {
                    // PERF: None protocol is 150% faster then Shell protocol
                    protocols: [AdbSubprocessNoneProtocol],
                }
            );
            return stdout;
        }).pipeThrough(
            new BufferedTransformStream((stream) => {
                return deserializeAndroidLogEntry(stream);
            })
        );
    }
}
