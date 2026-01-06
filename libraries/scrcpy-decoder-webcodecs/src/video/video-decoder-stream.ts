import { EventEmitter } from "@yume-chan/event";
import { TransformStream } from "@yume-chan/stream-extra";

export class VideoDecoderStream extends TransformStream<
    VideoDecoderConfig | EncodedVideoChunk,
    VideoFrame
> {
    #decoder!: VideoDecoder;

    /**
     * Gets the number of frames waiting to be decoded.
     */
    get decodeQueueSize() {
        return this.#decoder.decodeQueueSize;
    }

    #onDequeue = new EventEmitter<undefined>();
    /**
     * Gets an event when a frame is dequeued (either decoded or discarded).
     */
    get onDequeue() {
        return this.#onDequeue.event;
    }

    #framesDecoded = 0;
    /**
     * Gets the number of frames decoded by the decoder.
     */
    get framesDecoded() {
        return this.#framesDecoded;
    }

    #framesSkipped = 0;
    /**
     * Gets the number of frames skipped by the decoder.
     */
    get framesSkipped() {
        return this.#framesSkipped;
    }

    /**
     * Saved decoder configuration for use when resetting the native decoder.
     */
    #config?: VideoDecoderConfig;

    constructor() {
        super({
            start: async (controller) => {
                await Promise.resolve();
                this.#decoder = new VideoDecoder({
                    output: (frame) => {
                        this.#framesDecoded += 1;

                        controller.enqueue(frame);
                    },
                    error: (error) => {
                        controller.error(error);
                    },
                });
                this.#decoder.addEventListener("dequeue", () =>
                    this.#onDequeue.fire(undefined),
                );
            },
            transform: (chunk) => {
                if ("codec" in chunk) {
                    this.#config = chunk;
                    this.#decoder.configure(chunk);
                    return;
                }

                if (chunk.type === "key" && this.#decoder.decodeQueueSize) {
                    // If the device is too slow to decode all frames,
                    // Discard queued but not decoded frames when next keyframe arrives.
                    // (decoding can only start from keyframes)
                    // This limits the maximum latency to 1 keyframe interval
                    // (60 frames by default).
                    this.#framesSkipped += this.#decoder.decodeQueueSize;
                    this.#decoder.reset();

                    // Reconfigure the decoder so it can be used again
                    this.#decoder.configure(this.#config!);
                }

                this.#decoder.decode(chunk);
            },
            flush: async () => {
                await this.#decoder.flush();
                this.#decoder.close();
            },
        });
    }
}
