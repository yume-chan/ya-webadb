import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamDataPacket,
} from "@yume-chan/scrcpy";
import type { TransformStream } from "@yume-chan/stream-extra";

export type CodecTransformStream = TransformStream<
    CodecTransformStream.Input,
    CodecTransformStream.Output
>;

type PartialPlusUndefined<T> = {
    [P in keyof T]?: T[P] | undefined;
};

type Optional<T extends object, Keys extends keyof T> = Omit<T, Keys> &
    PartialPlusUndefined<Pick<T, Keys>>;

export namespace CodecTransformStream {
    export type Input =
        | ScrcpyMediaStreamConfigurationPacket
        | (ScrcpyMediaStreamDataPacket & { timestamp: number });

    export type Config = VideoDecoderConfig & {
        codedWidth: number;
        codedHeight: number;
        /**
         * Sets an optional raw buffer what will be prepended with the first key frame for decoding.
         *
         * Some codecs (e.g. H.264 and H.265 in Annex B format)
         * send configuration in separate packet,
         * but the configuration also needs to be feed into the decoder.
         */
        raw?: AllowSharedBufferSource;
    };

    export type VideoChunk = Optional<EncodedVideoChunkInit, "type">;

    export type Output = Config | VideoChunk;
}

export interface CodecTransformStreamConstructor {
    new (): CodecTransformStream;
}
