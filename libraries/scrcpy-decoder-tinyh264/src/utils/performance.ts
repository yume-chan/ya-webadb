import type { ScrcpyVideoDecoderPerformanceCounter } from "../types.js";

export class PerformanceCounter implements ScrcpyVideoDecoderPerformanceCounter {
    #framesDrawn = 0;
    get framesRendered() {
        return this.#framesDrawn;
    }

    #framesPresented = 0;
    get framesPresented() {
        return this.#framesPresented;
    }

    #framesSkipped = 0;
    get framesSkippedRendering() {
        return this.#framesSkipped;
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
            // In this case just leave `framesPresented` at `0`
        }
    }

    #handleAnimationFrame = () => {
        // Animation frame handler is called on every vertical sync interval.
        // Only then a frame is visible to the user.
        if (this.#framesDrawn > 0) {
            this.#framesPresented += 1;
            this.#framesDrawn = 0;
        }

        this.#animationFrameId = requestAnimationFrame(
            this.#handleAnimationFrame,
        );
    };

    increaseFramesSkipped() {
        this.#framesSkipped += 1;
    }

    increaseFramesDrawn() {
        this.#framesDrawn += 1;
    }

    dispose() {
        // `0` is a valid value for RAF ID
        if (this.#animationFrameId !== undefined) {
            cancelAnimationFrame(this.#animationFrameId);
        }
    }
}
