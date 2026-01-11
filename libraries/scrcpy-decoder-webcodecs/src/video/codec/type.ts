import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamDataPacket,
} from "@yume-chan/scrcpy";
import type { TransformStream } from "@yume-chan/stream-extra";

export type CodecTransformStream = TransformStream<
    CodecTransformStream.Input,
    CodecTransformStream.Output
>;

export namespace CodecTransformStream {
    export type Input =
        | ScrcpyMediaStreamConfigurationPacket
        | (ScrcpyMediaStreamDataPacket & { timestamp: number });

    export type Config = VideoDecoderConfig & {
        codedWidth: number;
        codedHeight: number;
    };

    export type Output = Config | EncodedVideoChunk;
}

export interface CodecTransformStreamConstructor {
    new (): CodecTransformStream;
}
