import type { ScrcpyVideoDecoderPerformanceCounter } from "../types.js";

export class PerformanceCounter implements ScrcpyVideoDecoderPerformanceCounter {
    #framesRendered = 0;
    /**
     * Gets the number of frames that have been drawn on the renderer.
     */
    get framesRendered() {
        return this.#framesRendered;
    }

    /**
     * `true` if the next vertical sync will display a different frame
     */
    #hasNewFrame = false;

    #framesDisplayed = 0;
    /**
     * Gets the number of frames that's visible to the user.
     *
     * Multiple frames might be rendered during one vertical sync interval,
     * but only the last of them is represented to the user.
     * This costs some performance but reduces latency by 1 frame.
     *
     * Might be `0` if the renderer is in a nested Web Worker on Chrome due to a Chrome bug.
     * https://issues.chromium.org/issues/41483010
     */
    get framesDisplayed() {
        return this.#framesDisplayed;
    }

    #framesSkippedRendering = 0;
    /**
     * Gets the number of frames that wasn't drawn on the renderer
     * because the renderer can't keep up
     */
    get framesSkippedRendering() {
        return this.#framesSkippedRendering;
    }

    #animationFrameId: number | undefined;

    constructor() {
        // `requestAnimationFrame` is available in Web Worker
        // https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/requestAnimationFrame
        try {
            this.#animationFrameId = requestAnimationFrame(
                this.#handleAnimationFrame,
            );
        } catch {
            // Chrome has a bug that `requestAnimationFrame` doesn't work in nested Workers
            // https://issues.chromium.org/issues/41483010
            // Because we need actual vertical sync to count presented frames,
            // `setTimeout` with a fixed delay also doesn't work.
            // In this case just leave `framesDisplayed` at `0`
        }
    }

    #handleAnimationFrame = () => {
        // Animation frame handler is called on every vertical sync interval.
        // Only then a frame is visible to the user.
        if (this.#hasNewFrame) {
            this.#framesDisplayed += 1;
            this.#hasNewFrame = false;
        }

        this.#animationFrameId = requestAnimationFrame(
            this.#handleAnimationFrame,
        );
    };

    increaseFramesSkipped() {
        this.#framesSkippedRendering += 1;
    }

    increaseFramesRendered() {
        this.#framesRendered += 1;
        this.#hasNewFrame = true;
    }

    dispose() {
        // `0` is a valid value for RAF ID
        if (this.#animationFrameId !== undefined) {
            cancelAnimationFrame(this.#animationFrameId);
        }
    }
}
