import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";

export interface CodecDecoder {
    decode(packet: ScrcpyMediaStreamPacket): void;
}

export interface CodecDecoderOptions {
    hardwareAcceleration?: HardwareAcceleration | undefined;
}

export interface CodecDecoderConstructor {
    new (
        decoder: VideoDecoder,
        updateSize: (width: number, height: number) => void,
        options?: CodecDecoderOptions,
    ): CodecDecoder;
}
