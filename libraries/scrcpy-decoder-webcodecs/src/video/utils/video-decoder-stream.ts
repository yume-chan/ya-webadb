import { EventEmitter } from "@yume-chan/event";
import { TransformStream } from "@yume-chan/stream-extra";

export class VideoDecoderStream extends TransformStream<
    VideoDecoderConfig | EncodedVideoChunk,
    VideoFrame
> {
    /**
     * The native decoder.
     *
     * `transform`, `flush` and `cancel` callbacks don't need to
     * check `#decoder.state` for "closed".
     *
     * Decoder can enter "closed" state by either:
     *   - Encounter a decoding error: this triggers `controller.error`,
     *     so no more transformer callbacks will be called.
     *   - Calling `close` manually: this only happens in `flush` and `cancel`,
     *     so no more transformer callbacks will be called.
     */
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
        let decoder!: VideoDecoder;

        super({
            start: (controller) => {
                // WARN: can't use `this` here

                decoder = new VideoDecoder({
                    output: (frame) => {
                        this.#framesDecoded += 1;
                        controller.enqueue(frame);
                    },
                    error: (error) => {
                        // Propagate decoder error to stream.
                        controller.error(error);
                        this.#dispose();
                    },
                });
            },
            transform: (chunk) => {
                if ("codec" in chunk) {
                    this.#config = chunk;
                    this.#decoder.configure(chunk);
                    return;
                }

                if (this.#decoder.state === "unconfigured") {
                    throw new Error("Decoder not configured");
                }

                if (chunk.type === "key" && this.#decoder.decodeQueueSize) {
                    // If the device is too slow to decode all frames,
                    // discard queued frames when next keyframe arrives.
                    // (decoding can only start from keyframes)
                    // This limits the maximum latency to 1 keyframe interval
                    // (60 frames by default).
                    this.#framesSkipped += this.#decoder.decodeQueueSize;
                    this.#decoder.reset();

                    // `reset` also resets the decoder configuration
                    // so we need to re-configure it again.
                    this.#decoder.configure(this.#config!);
                }

                this.#decoder.decode(chunk);
            },
            flush: async () => {
                // `flush` can only be called when `state` is "configured".
                if (this.#decoder.state === "configured") {
                    // Wait for all queued frames to be decoded when
                    // `writable` side ends without exception.
                    // The `readable` side will wait for `flush` to complete before closing.
                    await this.#decoder.flush();
                }
                this.#dispose();
            },
            cancel: () => {
                // Immediately close the decoder on stream cancel/error
                this.#dispose();
            },
        });

        this.#decoder = decoder;
        this.#decoder.addEventListener("dequeue", this.#handleDequeue);
    }

    #handleDequeue = () => {
        this.#onDequeue.fire(undefined);
    };

    #dispose() {
        this.#decoder.removeEventListener("dequeue", this.#handleDequeue);
        this.#onDequeue.dispose();

        if (this.#decoder.state !== "closed") {
            this.#decoder.close();
        }
    }
}
