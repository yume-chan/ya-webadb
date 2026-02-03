import type { MaybePromiseLike } from "@yume-chan/async";
import { TaskQueue } from "@yume-chan/stream-extra";

/**
 * Manages drawing and redrawing of video frames.
 */
export class RedrawController {
    #draw: (frame: VideoFrame) => MaybePromiseLike<undefined>;

    #queue = new TaskQueue();
    #pendingRedraw: AbortController | undefined;

    #lastFrame: VideoFrame | undefined;
    get lastFrame() {
        return this.#lastFrame;
    }

    constructor(draw: (frame: VideoFrame) => MaybePromiseLike<undefined>) {
        this.#draw = draw;
    }

    /**
     * Draws a new frame.
     *
     * If a redraw is in progress, it waits for the redraw to finish before drawing the new frame.
     *
     * If a redraw is in progress and another one is in queue,
     * it cancels the queued redraw and draws the new frame instead.
     *
     * @param frame A `VideoFrame` to draw. The frame will be closed after drawing.
     */
    draw(frame: VideoFrame) {
        this.#pendingRedraw?.abort();
        this.#pendingRedraw = undefined;

        this.#lastFrame?.close();
        this.#lastFrame = frame.clone();

        return this.#queue.enqueue(async (): Promise<undefined> => {
            try {
                await this.#draw(frame);
            } finally {
                frame.close();
            }
        }, true);
    }

    /**
     * Redraws the last drawn frame.
     *
     * If a draw or redraw is in progress, it waits for them to finish before redrawing.
     *
     * If a redraw is in progress and another one is in queue,
     * it cancels the queued redraw and redraws the latest frame instead.
     */
    async redraw(): Promise<undefined> {
        if (!this.#lastFrame || this.#pendingRedraw) {
            return;
        }

        const abortController = new AbortController();
        this.#pendingRedraw = abortController;

        return await this.#queue.enqueue(async (): Promise<undefined> => {
            if (abortController.signal.aborted) {
                return;
            }

            this.#pendingRedraw = undefined;

            const frame = this.#lastFrame!.clone();
            try {
                await this.#draw(frame);
            } finally {
                frame.close();
            }
        }, true);
    }

    dispose() {
        this.#pendingRedraw?.abort();

        this.#lastFrame?.close();
        this.#lastFrame = undefined;

        this.#queue.dispose();
    }
}
