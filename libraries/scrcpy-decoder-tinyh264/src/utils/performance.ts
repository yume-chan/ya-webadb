import type { ScrcpyVideoDecoderPerformanceCounter } from "../types.js";

export class PerformanceCounterImpl
    implements ScrcpyVideoDecoderPerformanceCounter
{
    #framesDrawn = 0;
    #framesPresented = 0;
    get framesRendered() {
        return this.#framesPresented;
    }

    #framesSkipped = 0;
    get framesSkipped() {
        return this.#framesSkipped;
    }

    #animationFrameId = 0;

    constructor() {
        this.#handleAnimationFrame();
    }

    #handleAnimationFrame = () => {
        // Animation frame handler is called on every vertical sync interval.
        // Only then a frame is visible to the user.
        if (this.#framesDrawn > 0) {
            this.#framesPresented += 1;
            this.#framesSkipped += this.#framesDrawn - 1;
            this.#framesDrawn = 0;
        }

        // `requestAnimationFrame` is also available in Web Worker
        // https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/requestAnimationFrame
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
        cancelAnimationFrame(this.#animationFrameId);
    }
}
