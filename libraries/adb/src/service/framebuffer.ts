import { BufferedReadableStream } from "@yume-chan/stream-extra";
import type { StructValue } from "@yume-chan/struct";
import { buffer, struct, StructEmptyError, u32 } from "@yume-chan/struct";

import type { Adb } from "../adb.js";

const Version = struct({ version: u32 }, { littleEndian: true });

export const AdbFrameBufferV1 = struct(
    {
        bpp: u32,
        size: u32,
        width: u32,
        height: u32,
        red_offset: u32,
        red_length: u32,
        blue_offset: u32,
        blue_length: u32,
        green_offset: u32,
        green_length: u32,
        alpha_offset: u32,
        alpha_length: u32,
        data: buffer("size"),
    },
    { littleEndian: true },
);

export type AdbFrameBufferV1 = StructValue<typeof AdbFrameBufferV1>;

export const AdbFrameBufferV2 = struct(
    {
        bpp: u32,
        colorSpace: u32,
        size: u32,
        width: u32,
        height: u32,
        red_offset: u32,
        red_length: u32,
        blue_offset: u32,
        blue_length: u32,
        green_offset: u32,
        green_length: u32,
        alpha_offset: u32,
        alpha_length: u32,
        data: buffer("size"),
    },
    { littleEndian: true },
);

export type AdbFrameBufferV2 = StructValue<typeof AdbFrameBufferV2>;

/**
 * ADB uses 8 int32 fields to describe bit depths
 *
 * The only combination I have seen is RGBA8888, which is
 *
 *   red_offset:   0
 *   red_length:   8
 *   blue_offset:  16
 *   blue_length:  8
 *   green_offset: 8
 *   green_length: 8
 *   alpha_offset: 24
 *   alpha_length: 8
 *
 * But it doesn't mean that other combinations are not possible.
 */
export type AdbFrameBuffer = AdbFrameBufferV1 | AdbFrameBufferV2;

export abstract class AdbFrameBufferError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class AdbFrameBufferUnsupportedVersionError extends AdbFrameBufferError {
    constructor(version: number) {
        super(`Unsupported FrameBuffer version ${version}`);
    }
}

export class AdbFrameBufferForbiddenError extends AdbFrameBufferError {
    constructor() {
        super("FrameBuffer is disabled by current app");
    }
}

export async function framebuffer(adb: Adb): Promise<AdbFrameBuffer> {
    const socket = await adb.createSocket("framebuffer:");
    const stream = new BufferedReadableStream(socket.readable);

    let version: number;
    try {
        ({ version } = await Version.deserialize(stream));
    } catch (e) {
        if (e instanceof StructEmptyError) {
            throw new AdbFrameBufferForbiddenError();
        }
        throw e;
    }

    switch (version) {
        case 1:
            // TODO: AdbFrameBuffer: does all v1 responses uses the same color space? Add it so the command returns same format for all versions.
            return await AdbFrameBufferV1.deserialize(stream);
        case 2:
            return await AdbFrameBufferV2.deserialize(stream);
        default:
            throw new AdbFrameBufferUnsupportedVersionError(version);
    }
}
