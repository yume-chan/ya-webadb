import type { MaybePromiseLike } from "@yume-chan/async";
import { PromiseResolver } from "@yume-chan/async";
import type {
    ScrcpyMediaStreamConfigurationPacket,
    ScrcpyMediaStreamDataPacket,
    ScrcpyMediaStreamPacket,
} from "@yume-chan/scrcpy";

import type { ScrcpyVideoDecoderPauseController } from "./types.js";

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

    constructor(
        onConfiguration: (
            packet: ScrcpyMediaStreamConfigurationPacket,
        ) => MaybePromiseLike<undefined>,
        onFrame: (
            packet: ScrcpyMediaStreamDataPacket,
        ) => MaybePromiseLike<undefined>,
    ) {
        this.#onConfiguration = onConfiguration;
        this.#onFrame = onFrame;
    }

    write = async (packet: ScrcpyMediaStreamPacket): Promise<undefined> => {
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

        switch (packet.type) {
            case "configuration":
                await this.#onConfiguration(packet);
                break;
            case "data":
                await this.#onFrame(packet);
                break;
        }
    };

    pause(): void {
        this.#paused = true;
    }

    async resume(): Promise<undefined> {
        if (!this.#paused) {
            return;
        }

        const resolver = new PromiseResolver<undefined>();
        this.#resuming = resolver.promise;

        this.#paused = false;

        if (this.#pendingConfiguration) {
            await this.#onConfiguration(this.#pendingConfiguration);
            this.#pendingConfiguration = undefined;
        }

        for (const frame of this.#pendingFrames) {
            if (this.#pendingFrames.length) {
                // Mark these frames with `pts: 0` so the renderer can skip them.
                // only the last frame needs to be rendered on resume
                frame.pts = BigInt(0);
            }
            await this.#onFrame(frame);
        }

        this.#pendingFrames.length = 0;

        resolver.resolve(undefined);
        this.#resuming = undefined;
    }
}
