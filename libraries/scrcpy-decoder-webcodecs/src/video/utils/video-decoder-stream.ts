import { EventEmitter } from "@yume-chan/event";
import type { ScrcpyVideoDecoderPerformanceCounterInterface } from "@yume-chan/scrcpy-decoder-shared";
import { ScrcpyVideoDecoderPerformanceCounter } from "@yume-chan/scrcpy-decoder-shared";
import { concatBuffers, TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "../codec/type.js";

export class VideoDecoderStream
    extends TransformStream<
        CodecTransformStream.Config | CodecTransformStream.VideoChunk,
        VideoFrame
    >
    implements ScrcpyVideoDecoderPerformanceCounterInterface
{
    #controller!: TransformStreamDefaultController<VideoFrame>;

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
    #decoder: VideoDecoder | undefined;

    /**
     * Gets the number of frames waiting to be decoded.
     */
    get decodeQueueSize() {
        return this.#decoder?.decodeQueueSize ?? 0;
    }

    #onDequeue = new EventEmitter<undefined>();
    /**
     * Gets an event when a frame is dequeued (either decoded or discarded).
     */
    get onDequeue() {
        return this.#onDequeue.event;
    }

    #counter = new ScrcpyVideoDecoderPerformanceCounter();
    /**
     * Gets the number of frames decoded by the decoder.
     */
    get framesDecoded() {
        return this.#counter.framesDecoded;
    }
    /**
     * Gets the number of frames skipped by the decoder.
     */
    get framesSkippedDecoding() {
        return this.#counter.framesSkippedDecoding;
    }
    /**
     * Gets the number of times the decoder has been reset to catch up new keyframes.
     */
    get decoderResetCount() {
        return this.#counter.decoderResetCount;
    }

    /**
     * Saved decoder configuration for use when resetting the native decoder.
     */
    #config?: CodecTransformStream.Config;

    #configured = false;

    #abortController = new AbortController();

    constructor() {
        let controller!: TransformStreamDefaultController<VideoFrame>;

        super({
            start: (controller_) => {
                // WARN: can't use `this` here
                controller = controller_;
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
                if (this.#decoder?.state === "configured") {
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

        this.#controller = controller;
        this.#createVideoDecoder();
    }

    #createVideoDecoder() {
        const decoder = new VideoDecoder({
            output: (frame) => {
                this.#counter.increaseFramesDecoded();
                this.#controller.enqueue(frame);
            },
            error: (error) => {
                if (error.name === "QuotaExceededError") {
                    // Chrome reclaims inactive `VideoDecoder`'s after 90 seconds
                    // (for example due to pausing decoding when the document is hidden).
                    // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/webcodecs/reclaimable_codec.cc;l=181;drc=aba14550ed0b4620deb59e7c5f551cbde8970fb3
                    // Reset states, it will be recreated in next `transform` call.
                    this.#decoder = undefined;
                    this.#configured = false;
                    return;
                }

                // Propagate other decoder errors to stream.
                this.#controller.error(error);
                this.#dispose();
            },
        });

        decoder.addEventListener(
            "dequeue",
            () => this.#onDequeue.fire(undefined),
            { signal: this.#abortController.signal },
        );

        this.#decoder = decoder;
        return decoder;
    }

    #handleVideoChunk(chunk: CodecTransformStream.VideoChunk) {
        if (!this.#config) {
            throw new Error("Decoder not configured");
        }

        if (chunk.type === "key") {
            if (this.#decoder?.decodeQueueSize) {
                // If the device is too slow to decode all frames,
                // discard queued frames when next keyframe arrives.
                // (decoding can only start from keyframes)
                // This limits the maximum latency to 1 keyframe interval
                // (60 frames by default).
                this.#counter.addFramesSkippedDecoding(
                    this.#decoder.decodeQueueSize,
                );
                this.#counter.increaseResetCount();
                this.#decoder.reset();

                // `reset` also resets the decoder configuration
                // so we need to re-configure it again.
                this.#configureAndDecodeFirstKeyFrame(chunk);
                return;
            }

            if (!this.#configured) {
                this.#configureAndDecodeFirstKeyFrame(chunk);
                return;
            }

            this.#decoder!.decode(
                // `type` has been checked to be "key"
                new EncodedVideoChunk(chunk as EncodedVideoChunkInit),
            );
            return;
        }

        if (!this.#configured) {
            if (chunk.type === undefined) {
                // Infer the first frame after configuration as keyframe
                // (`VideoDecoder` will throw error if it's not)
                this.#configureAndDecodeFirstKeyFrame(chunk);
                return;
            }

            throw new Error("Expect a keyframe but got a delta frame");
        }

        // Can't decode B-frames without a configured decoder
        // Ignore them until next keyframe arrives
        this.#decoder?.decode(
            new EncodedVideoChunk({
                // Treat `undefined` as "key" otherwise it won't decode
                type: chunk.type ?? "key",
                timestamp: chunk.timestamp,
                duration: chunk.duration!,
                data: chunk.data,
            }),
        );
    }

    #configureAndDecodeFirstKeyFrame(chunk: CodecTransformStream.VideoChunk) {
        // Lazily create the decoder
        // Or re-create it if it has been closed due to `QuotaExceededError`
        if (!this.#decoder) {
            // Assigning the return value only for TypeScript to narrow
            // `#decoder` type to non-nullable
            this.#decoder = this.#createVideoDecoder();
        }

        const config = this.#config!;

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

    #dispose() {
        this.#abortController.abort();
        this.#onDequeue.dispose();

        if (this.#decoder && this.#decoder.state !== "closed") {
            this.#decoder.close();
        }
    }
}
