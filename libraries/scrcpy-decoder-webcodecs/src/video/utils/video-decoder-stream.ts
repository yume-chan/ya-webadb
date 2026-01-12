import { EventEmitter } from "@yume-chan/event";
import { concatBuffers, TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "../codec/type.js";

export class VideoDecoderStream extends TransformStream<
    CodecTransformStream.Config | CodecTransformStream.VideoChunk,
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

    #decoderResetCount = 0;
    /**
     * Gets the number of times the decoder has been reset to catch up new keyframes.
     */
    get decoderResetCount() {
        return this.#decoderResetCount;
    }

    /**
     * Saved decoder configuration for use when resetting the native decoder.
     */
    #config?: CodecTransformStream.Config;

    #configured = false;

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
                    this.#configured = false;
                    return;
                }

                this.#handleVideoChunk(chunk);
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

    #handleVideoChunk(chunk: CodecTransformStream.VideoChunk) {
        if (!this.#config) {
            throw new Error("Decoder not configured");
        }

        if (chunk.type === "key") {
            if (this.#decoder.decodeQueueSize) {
                // If the device is too slow to decode all frames,
                // discard queued frames when next keyframe arrives.
                // (decoding can only start from keyframes)
                // This limits the maximum latency to 1 keyframe interval
                // (60 frames by default).
                this.#framesSkipped += this.#decoder.decodeQueueSize;
                this.#decoderResetCount += 1;
                this.#decoder.reset();

                // `reset` also resets the decoder configuration
                // so we need to re-configure it again.
                this.#configureAndDecodeFirstKeyFrame(this.#config, chunk);
                return;
            }

            if (!this.#configured) {
                this.#configureAndDecodeFirstKeyFrame(this.#config, chunk);
                return;
            }

            this.#decoder.decode(
                // `type` has been checked to be "key"
                new EncodedVideoChunk(chunk as EncodedVideoChunkInit),
            );
            return;
        }

        if (!this.#configured) {
            if (chunk.type === undefined) {
                // Infer the first frame after configuration as keyframe
                // (`VideoDecoder` will throw error if it's not)
                this.#configureAndDecodeFirstKeyFrame(this.#config, chunk);
                return;
            }

            throw new Error("Expect a keyframe but got a delta frame");
        }

        this.#decoder.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as "key" otherwise it won't decode
                type: chunk.type ?? "key",
                timestamp: chunk.timestamp,
                duration: chunk.duration!,
                data: chunk.data,
            }),
        );
    }

    #configureAndDecodeFirstKeyFrame(
        config: CodecTransformStream.Config,
        chunk: CodecTransformStream.VideoChunk,
    ) {
        this.#decoder.configure(config);
        this.#configured = true;

        if (config.raw) {
            this.#decoder.decode(
                new EncodedVideoChunk({
                    type: "key",
                    timestamp: chunk.timestamp,
                    duration: chunk.duration!,
                    data: concatBuffers([config.raw, chunk.data]),
                }),
            );
            return;
        }

        this.#decoder.decode(
            new EncodedVideoChunk({
                type: "key",
                timestamp: chunk.timestamp,
                duration: chunk.duration!,
                data: chunk.data,
            }),
        );
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
