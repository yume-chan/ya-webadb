import { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import { TransformStream } from "@yume-chan/stream-extra";

export class AudioDecodeStream extends TransformStream<
    ScrcpyMediaStreamPacket,
    Uint8Array
> {
    constructor(config: AudioDecoderConfig) {
        let decoder: AudioDecoder;
        super({
            start(controller) {
                decoder = new AudioDecoder({
                    error(error) {
                        controller.error(error);
                    },
                    output(output) {
                        const options: AudioDataCopyToOptions = {
                            format: "s16",
                            planeIndex: 0,
                        };
                        const buffer = new Uint8Array(
                            output.allocationSize(options)
                        );
                        output.copyTo(buffer, options);
                        controller.enqueue(buffer);
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
