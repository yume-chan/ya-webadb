import type { MaybePromiseLike } from "@yume-chan/async";

/**
 * Manages drawing and redrawing of video frames.
 */
export class RedrawController {
    #draw: (frame: VideoFrame) => MaybePromiseLike<undefined>;

    #ready = Promise.resolve(undefined);
    #pendingRedraw: AbortController | undefined;
    #error: unknown;

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
     * @param frame A `VideoFrame` to draw
     */
    draw(frame: VideoFrame) {
        if (this.#error) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw this.#error;
        }

        this.#lastFrame?.close();
        this.#lastFrame = frame.clone();

        this.#pendingRedraw?.abort();
        this.#pendingRedraw = undefined;

        this.#ready = this.#ready.then(async (): Promise<undefined> => {
            try {
                await this.#draw(frame);
            } catch (e) {
                this.#error = e;
                throw e;
            } finally {
                frame.close();
            }
        });

        return this.#ready;
    }

    /**
     * Redraws the last drawn frame.
     *
     * If a draw or redraw is in progress, it waits for them to finish before redrawing.
     *
     * If a redraw is in progress and another one is in queue,
     * it cancels the queued redraw and redraws the latest frame instead.
     */
    redraw(): void {
        if (!this.#lastFrame || this.#pendingRedraw) {
            return;
        }

        if (this.#error) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw this.#error;
        }

        const abortController = new AbortController();
        this.#pendingRedraw = abortController;

        this.#ready = this.#ready.then(async (): Promise<undefined> => {
            if (abortController.signal.aborted) {
                return;
            }

            this.#pendingRedraw = undefined;

            const frame = this.#lastFrame!.clone();
            try {
                await this.#draw(frame);
            } catch (e) {
                this.#error = e;
            } finally {
                frame.close();
            }
        });
    }

    dispose() {
        this.#lastFrame?.close();
        this.#pendingRedraw?.abort();
        this.#error = new Error("Can't write to a closed renderer");
    }
}
