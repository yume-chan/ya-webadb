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

    pause(): void {
        if (this.#disposed) {
            throw new Error("Attempt to pause a closed decoder");
        }

        this.#paused = true;
    }

    async resume(): Promise<undefined> {
        if (this.#disposed) {
            throw new Error("Attempt to resume a closed decoder");
        }

        if (!this.#paused) {
            return;
        }

        const resolver = new PromiseResolver<undefined>();
        this.#resuming = resolver.promise;

        this.#paused = false;

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

    dispose() {
        if (this.#disposed) {
            return;
        }

        this.#disposed = true;

        this.#pendingConfiguration = undefined;
        this.#pendingFrames.length = 0;
    }
}
