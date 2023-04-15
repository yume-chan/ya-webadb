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
                                    // AAC decodes to "f32-planar",
                                    // converting to another format may cause audio glitches on Chrome.
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
                        // https://www.w3.org/TR/webcodecs-aac-codec-registration/#audiodecoderconfig-description
                        // Raw AAC stream needs `description` to be set.
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
                        // Opus decodes to "f32",
                        // converting to another format may cause audio glitches on Chrome.
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
