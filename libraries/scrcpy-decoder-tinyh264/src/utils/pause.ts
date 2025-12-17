import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";

import type { ScrcpyVideoDecoderPauseController } from "../types.js";

export class PauseControllerImpl implements ScrcpyVideoDecoderPauseController {
    #paused = false;
    #pausedExplicitly = false;
    get paused() {
        return this.#paused;
    }

    #onConfiguration: (
        packet: ScrcpyMediaStreamConfigurationPacket,
    ) => MaybePromiseLike<undefined>;
    #onFrame: (
        packet: ScrcpyMediaStreamDataPacket,
        skipRendering: boolean,
    ) => MaybePromiseLike<undefined>;

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

    constructor(
        onConfiguration: (
            packet: ScrcpyMediaStreamConfigurationPacket,
        ) => MaybePromiseLike<undefined>,
        onFrame: (
            packet: ScrcpyMediaStreamDataPacket,
            skipRendering: boolean,
        ) => MaybePromiseLike<undefined>,
    ) {
        this.#onConfiguration = onConfiguration;
        this.#onFrame = onFrame;
    }

    write = async (packet: ScrcpyMediaStreamPacket): Promise<undefined> => {
        if (this.#disposed) {
            throw new Error("Attempt to write to a closed decoder");
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
                await this.#onConfiguration(packet);
                break;
            case "data":
                await this.#onFrame(packet, false);
                break;
        }
    };

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

    async #resumeInternal(explicitly: boolean): Promise<undefined> {
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
            await this.#onConfiguration(this.#pendingConfiguration);
            this.#pendingConfiguration = undefined;

            if (this.#disposed) {
                return;
            }
        }

        for (
            let i = 0, length = this.#pendingFrames.length;
            i < length;
            i += 1
        ) {
            const frame = this.#pendingFrames[i]!;
            // All pending frames except the last one don't need to be rendered
            // because they are decoded in quick succession by the decoder
            // and won't be visible
            await this.#onFrame(frame, i !== length - 1);

            if (this.#disposed) {
                return;
            }
        }

        this.#pendingFrames.length = 0;

        resolver.resolve(undefined);
        this.#resuming = undefined;
    }

    resume(): Promise<undefined> {
        return this.#resumeInternal(true);
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
