import {
    getUint16BigEndian,
    getUint32BigEndian,
} from "@yume-chan/no-data-view";
import type { ReadableStream } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";
import type { AsyncExactReadable } from "@yume-chan/struct";
import { decodeUtf8 } from "@yume-chan/struct";

import type {
    ScrcpyVideoStream,
    ScrcpyVideoStreamMetadata,
} from "../../base/index.js";
import { ScrcpyVideoCodecId } from "../../base/index.js";

/**
 * Parse a fixed-length, null-terminated string.
 * @param stream The stream to read from
 * @param maxLength The maximum length of the string, including the null terminator, in bytes
 * @returns The parsed string, without the null terminator
 */
export async function readString(
    stream: AsyncExactReadable,
    maxLength: number,
): Promise<string> {
    const buffer = await stream.readExactly(maxLength);
    // If null terminator is not found, `subarray(0, -1)` will remove the last byte
    // But since it's a invalid case, it's fine
    return decodeUtf8(buffer.subarray(0, buffer.indexOf(0)));
}

export async function readU16(stream: AsyncExactReadable): Promise<number> {
    const buffer = await stream.readExactly(2);
    return getUint16BigEndian(buffer, 0);
}

export async function readU32(stream: AsyncExactReadable): Promise<number> {
    const buffer = await stream.readExactly(4);
    return getUint32BigEndian(buffer, 0);
}

export async function parseVideoStreamMetadata(
    stream: ReadableStream<Uint8Array>,
): Promise<ScrcpyVideoStream> {
    const buffered = new BufferedReadableStream(stream);
    const metadata: ScrcpyVideoStreamMetadata = {
        codec: ScrcpyVideoCodecId.H264,
    };
    metadata.deviceName = await readString(buffered, 64);
    metadata.width = await readU16(buffered);
    metadata.height = await readU16(buffered);
    return { stream: buffered.release(), metadata };
}
