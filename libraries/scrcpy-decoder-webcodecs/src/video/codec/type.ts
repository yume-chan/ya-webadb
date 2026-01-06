import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamDataPacket,
} from "@yume-chan/scrcpy";
import type { TransformStream } from "@yume-chan/stream-extra";

export type CodecDecoder = TransformStream<
    CodecDecoder.Input,
    CodecDecoder.Output
>;

export namespace CodecDecoder {
    export type Input =
        | ScrcpyMediaStreamConfigurationPacket
        | (ScrcpyMediaStreamDataPacket & { timestamp: number });

    export type Config = VideoDecoderConfig & {
        codedWidth: number;
        codedHeight: number;
    };

    export type Output = Config | EncodedVideoChunk;
}

export interface CodecDecoderConstructor {
    new (): CodecDecoder;
}
