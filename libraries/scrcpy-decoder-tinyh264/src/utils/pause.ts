import { PromiseResolver } from "@yume-chan/async";
import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";
import type { TransformStreamDefaultController } from "@yume-chan/stream-extra";
import { TransformStream } from "@yume-chan/stream-extra";

import type { ScrcpyVideoDecoderPauseController } from "../types.js";

export class PauseController
    extends TransformStream<PauseController.Input, PauseController.Output>
    implements ScrcpyVideoDecoderPauseController
{
    #controller: TransformStreamDefaultController<PauseController.Output>;

    #paused = false;
    #pausedExplicitly = false;
    get paused() {
        return this.#paused;
    }

    /**
     * Store incoming configuration change when paused,
     * to recreate the decoder on resume
     */
    #pendingConfiguration: ScrcpyMediaStreamConfigurationPacket | undefined;
    /**
     * Store incoming frames when paused, so the latest frame can be rendered on resume
     * Because non-key frames require their previous frames to be decoded,
     * we need to store several frames.
     *
     * There can be two situations:
     *
     *   1. **All pending frames are non-key frames:**
     *      the decoder still holds the previous frames to decode them directly.
     *
     *   2. **A keyframe is encountered while pausing:**
     *      The list is cleared before pushing the keyframe.
     *      The decoder can start decoding from the keyframe directly.
     */
    #pendingFrames: ScrcpyMediaStreamDataPacket[] = [];

    /** Block incoming frames while resuming */
    #resuming: Promise<undefined> | undefined;

    #disposed = false;

    constructor() {
        let controller!: TransformStreamDefaultController<PauseController.Output>;

        super({
            start: (controller_) => {
                controller = controller_;
            },
            transform: async (packet, controller) => {
                if (this.#disposed) {
                    return;
                }

                if (this.#paused) {
                    switch (packet.type) {
                        case "configuration":
                            this.#pendingConfiguration = packet;
                            this.#pendingFrames.length = 0;
                            break;
                        case "data":
                            if (packet.keyframe) {
                                this.#pendingFrames.length = 0;
                            }
                            // Generally there won't be too many non-key frames
                            // (because that's bad for video quality),
                            // Also all frames are required for proper decoding
                            this.#pendingFrames.push(packet);
                            break;
                    }
                    return;
                }

                await this.#resuming;

                if (this.#disposed) {
                    return;
                }

                switch (packet.type) {
                    case "configuration":
                        controller.enqueue(packet);
                        break;
                    case "data":
                        controller.enqueue({
                            ...packet,
                            skipRendering: false,
                        });
                        break;
                }
            },
        });

        this.#controller = controller;
    }

    #pauseInternal(explicitly: boolean): void {
        if (this.#disposed) {
            throw new Error("Attempt to pause a closed decoder");
        }

        this.#paused = true;
        if (explicitly) {
            this.#pausedExplicitly = true;
        }
    }

    pause(): void {
        this.#pauseInternal(true);
    }

    #resumeInternal(explicitly: boolean): undefined {
        if (this.#disposed) {
            throw new Error("Attempt to resume a closed decoder");
        }

        if (!this.#paused) {
            return;
        }

        // Visibility tracker (explicitly = false) can't resume
        // a decoder paused by user (#pausedExplicitly = true)
        if (this.#pausedExplicitly && !explicitly) {
            return;
        }

        const resolver = new PromiseResolver<undefined>();
        this.#resuming = resolver.promise;

        this.#paused = false;
        this.#pausedExplicitly = false;

        if (this.#pendingConfiguration) {
            this.#controller.enqueue(this.#pendingConfiguration);
            this.#pendingConfiguration = undefined;

            if (this.#disposed) {
                return;
            }
        }

        // `#pendingFrames` won't change during iteration
        // because it can only change when `#paused` is `true`,
        // but the code above already sets that to `false`
        for (const [index, frame] of this.#pendingFrames.entries()) {
            // All pending frames except the last one don't need to be rendered
            // because they are decoded in quick succession by the decoder
            // and won't be visible
            this.#controller.enqueue({
                ...frame,
                skipRendering: index !== this.#pendingFrames.length - 1,
            });
        }

        this.#pendingFrames.length = 0;

        resolver.resolve(undefined);
        this.#resuming = undefined;
    }

    resume(): undefined {
        this.#resumeInternal(true);
    }

    #disposeVisibilityTracker: (() => undefined) | undefined;

    trackDocumentVisibility(document: Document): () => undefined {
        // Can only track one document
        this.#disposeVisibilityTracker?.();

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                this.#pauseInternal(false);
            } else {
                void this.#resumeInternal(false);
            }
        };

        handleVisibilityChange();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        let disposed = false;

        this.#disposeVisibilityTracker = () => {
            // Make sure the visibility tracker is only disposed once
            // Do not resume if it's paused by another visibility tracker
            if (disposed) {
                return;
            }
            disposed = true;

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            // Do not resume if decoder is already disposed
            if (!this.#disposed) {
                void this.#resumeInternal(false);
            }
        };
        return this.#disposeVisibilityTracker;
    }

    dispose() {
        if (this.#disposed) {
            return;
        }

        this.#disposed = true;

        this.#pendingConfiguration = undefined;
        this.#pendingFrames.length = 0;

        this.#disposeVisibilityTracker?.();
    }
}

export namespace PauseController {
    export type Input = ScrcpyMediaStreamPacket;
    export type Output =
        | ScrcpyMediaStreamConfigurationPacket
        | (ScrcpyMediaStreamDataPacket & { skipRendering: boolean });
}
