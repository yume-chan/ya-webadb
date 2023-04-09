import { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { TransformStream } from "@yume-chan/stream-extra";

export class AacDecodeStream extends TransformStream<
    ScrcpyMediaStreamPacket,
    Float32Array[]
> {
    constructor(config: AudioDecoderConfig) {
        let decoder: AudioDecoder;
        super({
            start(controller) {
                decoder = new AudioDecoder({
                    error(error) {
                        console.log("audio decoder error: ", error);
                        controller.error(error);
                    },
                    output(output) {
                        controller.enqueue(
                            Array.from({ length: 2 }, (_, i) => {
                                const options: AudioDataCopyToOptions = {
                                    // Chrome only supports "f32-planar"
                                    format: "f32-planar",
                                    planeIndex: i,
                                };
                                const buffer = new Float32Array(
                                    output.allocationSize(options) /
                                        Float32Array.BYTES_PER_ELEMENT
                                );
                                output.copyTo(buffer, options);
                                return buffer;
                            })
                        );
                    },
                });
            },
            transform(chunk) {
                switch (chunk.type) {
                    case "configuration":
                        decoder.configure({
                            ...config,
                            description: chunk.data,
                        });
                        break;
                    case "data":
                        decoder.decode(
                            new EncodedAudioChunk({
                                data: chunk.data,
                                type: "key",
                                timestamp: 0,
                            })
                        );
                }
            },
            async flush() {
                await decoder!.flush();
            },
        });
    }
}

export class OpusDecodeStream extends TransformStream<
    ScrcpyMediaStreamPacket,
    Float32Array
> {
    constructor(config: AudioDecoderConfig) {
        let decoder: AudioDecoder;
        super({
            start(controller) {
                decoder = new AudioDecoder({
                    error(error) {
                        console.log("audio decoder error: ", error);
                        controller.error(error);
                    },
                    output(output) {
                        const options: AudioDataCopyToOptions = {
                            format: "f32",
                            planeIndex: 0,
                        };
                        const buffer = new Float32Array(
                            output.allocationSize(options) /
                                Float32Array.BYTES_PER_ELEMENT
                        );
                        output.copyTo(buffer, options);
                        controller.enqueue(buffer);
                    },
                });
                decoder.configure(config);
            },
            transform(chunk) {
                switch (chunk.type) {
                    case "configuration":
                        // configuration data is a opus-in-ogg identification header,
                        // but stream data is raw opus,
                        // so it has no use here.
                        break;
                    case "data":
                        if (chunk.data.length === 0) {
                            break;
                        }
                        decoder.decode(
                            new EncodedAudioChunk({
                                type: "key",
                                timestamp: 0,
                                data: chunk.data,
                            })
                        );
                }
            },
            async flush() {
                await decoder!.flush();
            },
        });
    }
}
