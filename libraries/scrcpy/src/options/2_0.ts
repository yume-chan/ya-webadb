// cspell:ignore scid

import type { ReadableStream } from "@yume-chan/stream-extra";
import { BufferedReadableStream } from "@yume-chan/stream-extra";
import type { ValueOrPromise } from "@yume-chan/struct";
import Struct, { NumberFieldType, placeholder } from "@yume-chan/struct";

import type {
    AndroidMotionEventAction,
    ScrcpyInjectTouchControlMessage,
} from "../control/index.js";

import { ScrcpyFloatToUint16FieldDefinition } from "./1_16/index.js";
import type { ScrcpyOptionsInit1_24 } from "./1_24.js";
import { ScrcpyOptions1_25 } from "./1_25/index.js";
import type { ScrcpyOptionValue, ScrcpyVideoStreamMetadata } from "./types.js";

export const ScrcpyInjectTouchControlMessage2_0 = new Struct()
    .uint8("type")
    .uint8("action", placeholder<AndroidMotionEventAction>())
    .uint64("pointerId")
    .uint32("pointerX")
    .uint32("pointerY")
    .uint16("screenWidth")
    .uint16("screenHeight")
    .field("pressure", ScrcpyFloatToUint16FieldDefinition)
    .uint32("actionButton")
    .uint32("buttons");

export type ScrcpyInjectTouchControlMessage2_0 =
    (typeof ScrcpyInjectTouchControlMessage2_0)["TInit"];

export class ScrcpyInstanceId implements ScrcpyOptionValue {
    public static readonly NONE = new ScrcpyInstanceId(-1);

    public static random(): ScrcpyInstanceId {
        // A random 31-bit unsigned integer
        return new ScrcpyInstanceId((Math.random() * 0x80000000) | 0);
    }

    public value: number;

    public constructor(value: number) {
        this.value = value;
    }

    public toOptionValue(): string | undefined {
        if (this.value < 0) {
            return undefined;
        }
        return this.value.toString(16);
    }
}

export interface ScrcpyOptionsInit2_0 extends ScrcpyOptionsInit1_24 {
    scid: ScrcpyInstanceId;
    codec: "h264" | "h265" | "av1";
    sendCodecId: boolean;
}

export class ScrcpyOptions2_0<
    T extends ScrcpyOptionsInit2_0 = ScrcpyOptionsInit2_0
> extends ScrcpyOptions1_25<T> {
    public constructor(init: Partial<ScrcpyOptionsInit2_0>) {
        if (!init.rawVideoStream) {
            init.sendCodecId = false;
        }

        super(init);
    }

    public override getDefaultValues(): T {
        return Object.assign(super.getDefaultValues(), {
            scid: ScrcpyInstanceId.NONE,
            codec: "h264",
            sendCodecId: true,
        } satisfies Omit<ScrcpyOptionsInit2_0, keyof ScrcpyOptionsInit1_24>);
    }

    public override parseVideoStreamMetadata(
        stream: ReadableStream<Uint8Array>
    ): ValueOrPromise<[ReadableStream<Uint8Array>, ScrcpyVideoStreamMetadata]> {
        const sendCodecId =
            this.value.sendCodecId ?? this.getDefaultValues().sendCodecId;
        if (!sendCodecId) {
            return super.parseVideoStreamMetadata(stream);
        } else {
            return (async () => {
                let metadata: ScrcpyVideoStreamMetadata;
                [stream, metadata] = await super.parseVideoStreamMetadata(
                    stream
                );
                const buffered = new BufferedReadableStream(stream);
                metadata.codec = NumberFieldType.Uint32.deserialize(
                    await buffered.readExactly(4),
                    false
                );
                return [buffered.release(), metadata];
            })();
        }
    }

    public override serializeInjectTouchControlMessage(
        message: ScrcpyInjectTouchControlMessage
    ): Uint8Array {
        return ScrcpyInjectTouchControlMessage2_0.serialize(message);
    }
}
