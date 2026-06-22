import { EventEmitter, StickyEventEmitter } from "@yume-chan/event";
import type { ScrcpyVideoDecoderPerformanceCounterInterface } from "@yume-chan/scrcpy-decoder-shared";
import { ScrcpyVideoDecoderPerformanceCounter } from "@yume-chan/scrcpy-decoder-shared";
import { concatBuffers, TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "../codec/type.js";

type State =
    | {
          type: "unconfigured";
      }
    | {
          type: "configured";
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
          decoder: VideoDecoder;
          /** Saved configuration for use when resetting/re-creating the decoder. */
          config: CodecTransformStream.Config;
      }
    | {
          type: "decoding";
          decoder: VideoDecoder;
          /** Saved configuration for use when resetting/re-creating the decoder. */
          config: CodecTransformStream.Config;
          /** Saved frames since last keyframe for use when re-creating the decoder */
          frames: CodecTransformStream.VideoChunk[];
      }
    | {
          type: "reclaimed";
          /** Saved configuration for use when re-creating the decoder. */
          config: CodecTransformStream.Config;
          /** Saved frames since last keyframe for use when re-creating the decoder */
          frames: CodecTransformStream.VideoChunk[] | undefined;
      };

function decodeFirstKeyFrame(
    decoder: VideoDecoder,
    config: CodecTransformStream.Config,
    chunk: CodecTransformStream.VideoChunk,
) {
    decoder.decode(
        new EncodedVideoChunk({
            type: "key",
            timestamp: chunk.timestamp,
            // `lib.dom.d.ts` doesn't allow `duration` to be undefined.
            duration: chunk.duration!,
            data: config.raw
                ? concatBuffers([config.raw, chunk.data])
                : chunk.data,
        }),
    );
}

function decodeFrame(
    decoder: VideoDecoder,
    chunk: CodecTransformStream.VideoChunk,
) {
    decoder.decode(
        new EncodedVideoChunk({
            type: chunk.type,
            timestamp: chunk.timestamp,
            // `lib.dom.d.ts` doesn't allow `duration` to be undefined.
            duration: chunk.duration!,
            data: chunk.data,
        }),
    );
}

export class VideoDecoderStream
    extends TransformStream<
        CodecTransformStream.Config | CodecTransformStream.VideoChunk,
        VideoFrame
    >
    implements ScrcpyVideoDecoderPerformanceCounterInterface
{
    #controller!: TransformStreamDefaultController<VideoFrame>;

    #state: State = { type: "unconfigured" };

    #hardwareAcceleration = new StickyEventEmitter<
        Exclude<CodecTransformStream.Config["hardwareAcceleration"], undefined>
    >({
        initialValue: "no-preference",
        equals: (a, b) => a === b,
    });
    get hardwareAcceleration() {
        return this.#hardwareAcceleration.value;
    }
    get onHardwareAccelerationChange() {
        return this.#hardwareAcceleration.event;
    }

    /**
     * Gets the number of frames waiting to be decoded.
     */
    get decodeQueueSize() {
        if ("decoder" in this.#state) {
            return this.#state.decoder.decodeQueueSize;
        }

        return 0;
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

    #abortController = new AbortController();
    #skipFramesBefore = -1;

    constructor() {
        let controller!: TransformStreamDefaultController<VideoFrame>;

        super({
            start: (controller_) => {
                // WARN: can't use `this` here
                controller = controller_;
            },
            transform: async (chunk) => {
                if ("codec" in chunk) {
                    this.#hardwareAcceleration.fire(
                        chunk.hardwareAcceleration ?? "no-preference",
                    );
                    // Validate the config by creating decoder right away
                    switch (this.#state.type) {
                        case "unconfigured":
                        case "reclaimed":
                            this.#state = {
                                type: "configured",
                                decoder: this.#createDecoder(chunk),
                                config: chunk,
                            };
                            break;
                        // @ts-expect-error: intentional case fallthrough
                        case "decoding":
                            await this.#state.decoder.flush();
                        // fallthrough
                        case "configured":
                            // Reuse the existing decoder.
                            // `decoder` is definitely in "configured" state,
                            // otherwise the stream is in error state
                            // and no `transform` callbacks will be called.
                            this.#state.decoder.configure(chunk);
                            this.#state = {
                                type: "configured",
                                decoder: this.#state.decoder,
                                config: chunk,
                            };
                            break;
                    }
                    return;
                }

                this.#handleVideoChunk(chunk);
            },
            flush: async () => {
                // only call `flush` when `decoder.state` is "configured".
                if (
                    "decoder" in this.#state &&
                    this.#state.decoder.state === "configured"
                ) {
                    // This also delays closing `readable` and `writable` streams
                    // (if they are not in error state) until all frames are decoded.
                    await this.#state.decoder.flush();
                }
                this.#dispose();
            },
            cancel: () => {
                // Immediately close the decoder on stream cancel/error
                this.#dispose();
            },
        });

        this.#controller = controller;
    }

    #handleVideoChunk(chunk: CodecTransformStream.VideoChunk) {
        switch (this.#state.type) {
            case "unconfigured":
                throw new Error("Decoder not configured");
            case "configured": {
                if (chunk.type === "delta") {
                    throw new Error("Expect a keyframe but got a delta frame");
                }

                decodeFirstKeyFrame(
                    this.#state.decoder,
                    this.#state.config,
                    chunk,
                );

                this.#state = {
                    type: "decoding",
                    decoder: this.#state.decoder,
                    config: this.#state.config,
                    frames: [chunk],
                };
                break;
            }
            case "decoding":
                if (chunk.type === "key") {
                    this.#state.frames.length = 0;
                }
                this.#state.frames.push(chunk);

                decodeFrame(this.#state.decoder, chunk);
                break;
            case "reclaimed": {
                const decoder = this.#createDecoder(this.#state.config);

                if (chunk.type === "key") {
                    decodeFirstKeyFrame(decoder, this.#state.config, chunk);

                    this.#state = {
                        type: "decoding",
                        decoder: decoder,
                        config: this.#state.config,
                        frames: [chunk],
                    };
                    return;
                }

                if (!this.#state.frames) {
                    // Reclaimed when configured but no frames have been decoded yet,
                    // so a keyframe is required to start decoding.
                    throw new Error("Expect a keyframe but got a delta frame");
                }

                decodeFirstKeyFrame(
                    decoder,
                    this.#state.config,
                    this.#state.frames[0]!,
                );

                // `chunk`s must have monotonic timestamps, so we can skip all frames before `chunk`.
                this.#skipFramesBefore = chunk.timestamp;
                this.#state.frames.push(chunk);

                for (const frame of this.#state.frames.slice(1)) {
                    decodeFrame(decoder, frame);
                }

                this.#state = {
                    type: "decoding",
                    decoder: decoder,
                    config: this.#state.config,
                    frames: this.#state.frames,
                };

                break;
            }
        }
    }

    #createDecoder(config: CodecTransformStream.Config) {
        const decoder = new VideoDecoder({
            output: (frame) => {
                if (frame.timestamp < this.#skipFramesBefore) {
                    frame.close();
                    return;
                }

                this.#counter.increaseFramesDecoded();
                try {
                    this.#controller.enqueue(frame);
                } catch {
                    // `controller` is closed
                    frame.close();
                }
            },
            error: (error) => {
                if (error.name === "QuotaExceededError") {
                    // Chrome reclaims inactive `VideoDecoder`'s after 90 seconds
                    // (for example due to pausing decoding when the document is hidden).
                    // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/webcodecs/reclaimable_codec.cc;l=181;drc=aba14550ed0b4620deb59e7c5f551cbde8970fb3
                    // Reset states, it will be recreated in next `transform` call.
                    switch (this.#state.type) {
                        case "unconfigured":
                        case "reclaimed":
                            // Don't throw, report errors to stream
                            this.#controller.error(
                                new Error(
                                    "Unexpected state when reclaiming decoder",
                                ),
                            );
                            this.#dispose();
                            return;
                        case "configured":
                            // Unlike `transform` callback,
                            // this doesn't re-create the decoder immediately,
                            // because the config has already been validated,
                            // and since browser reclaims the decoder to save hardware resources,
                            // we don't want to undo that by creating a new decoder immediately.
                            this.#state = {
                                type: "reclaimed",
                                config,
                                frames: undefined,
                            };
                            break;
                        case "decoding":
                            this.#state = {
                                type: "reclaimed",
                                config,
                                frames: this.#state.frames,
                            };
                            break;
                    }
                    return;
                }

                // Maybe the decoder is hardware accelerated but the hardware has an issue,
                // retry with software decoder.
                if (
                    error.name === "EncodingError" &&
                    this.#state.type === "decoding" &&
                    config.hardwareAcceleration !== "prefer-software"
                ) {
                    try {
                        config.hardwareAcceleration = "prefer-software";
                        this.#hardwareAcceleration.fire("prefer-software");
                        const decoder = this.#createDecoder(config);

                        // Replay frames with rendering skipping
                        this.#skipFramesBefore =
                            this.#state.frames.at(-1)!.timestamp;
                        decodeFirstKeyFrame(
                            decoder,
                            config,
                            this.#state.frames[0]!,
                        );
                        for (const frame of this.#state.frames.slice(1)) {
                            decodeFrame(decoder, frame);
                        }

                        // Update state
                        this.#state.decoder = decoder;
                        return;
                    } catch {
                        // ignore, report original error to stream
                    }
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

        decoder.configure(config);

        return decoder;
    }

    #dispose() {
        this.#abortController.abort();
        this.#onDequeue.dispose();

        if (
            "decoder" in this.#state &&
            this.#state.decoder.state !== "closed"
        ) {
            this.#state.decoder.close();
        }
        this.#state = { type: "unconfigured" };
    }
}
