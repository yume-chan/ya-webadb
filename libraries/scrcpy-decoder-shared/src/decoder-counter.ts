export interface ScrcpyVideoDecoderPerformanceCounterInterface {
    /**
     * Gets the number of times the decoder has been reset to catch up new keyframes.
     */
    readonly decoderResetCount: number;
    /**
     * Gets the number of frames decoded by the decoder.
     */
    readonly framesDecoded: number;
    /**
     * Gets the number of frames skipped by the decoder.
     */
    readonly framesSkippedDecoding: number;
}

export class ScrcpyVideoDecoderPerformanceCounter implements ScrcpyVideoDecoderPerformanceCounterInterface {
    #decoderResetCount = 0;
    /**
     * Gets the number of times the decoder has been reset to catch up new keyframes.
     */
    get decoderResetCount() {
        return this.#decoderResetCount;
    }

    #framesDecoded = 0;
    /**
     * Gets the number of frames decoded by the decoder.
     */
    get framesDecoded() {
        return this.#framesDecoded;
    }

    #framesSkippedDecoding = 0;
    /**
     * Gets the number of frames skipped by the decoder.
     */
    get framesSkippedDecoding() {
        return this.#framesSkippedDecoding;
    }

    increaseResetCount() {
        this.#decoderResetCount += 1;
    }

    increaseFramesDecoded() {
        this.#framesDecoded += 1;
    }

    addFramesDecoded(count: number) {
        this.#framesDecoded += count;
    }

    addFramesSkippedDecoding(count: number) {
        this.#framesSkippedDecoding += count;
    }
}
