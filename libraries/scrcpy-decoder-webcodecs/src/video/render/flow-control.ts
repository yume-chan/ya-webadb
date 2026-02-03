import type { ScrcpyVideoDecoderPerformanceCounter } from "@yume-chan/scrcpy-decoder-tinyh264";
import { PerformanceCounter } from "@yume-chan/scrcpy-decoder-tinyh264";
import type {
    PushReadableStreamController,
    ReadableStream,
    TransformStream,
    WritableStreamDefaultController,
} from "@yume-chan/stream-extra";
import {
    PushReadableStream,
    tryClose,
    WritableStream,
} from "@yume-chan/stream-extra";

export class RendererController
    implements
        TransformStream<VideoFrame, VideoFrame>,
        ScrcpyVideoDecoderPerformanceCounter
{
    #readable: ReadableStream<VideoFrame>;
    #readableController!: PushReadableStreamController<VideoFrame>;
    get readable() {
        return this.#readable;
    }

    #writable: WritableStream<VideoFrame>;
    #writableController!: WritableStreamDefaultController;
    get writable() {
        return this.#writable;
    }

    #captureFrame: VideoFrame | undefined;
    get captureFrame() {
        return this.#captureFrame;
    }

    #nextFrame: VideoFrame | undefined;

    #drawTask: Promise<undefined> | undefined;

    #counter = new PerformanceCounter();
    /**
     * Gets the number of frames that have been drawn on the renderer.
     */
    get framesRendered() {
        return this.#counter.framesRendered;
    }
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
        return this.#counter.framesDisplayed;
    }
    /**
     * Gets the number of frames that wasn't drawn on the renderer
     * because the renderer can't keep up
     */
    get framesSkippedRendering() {
        return this.#counter.framesSkippedRendering;
    }

    constructor() {
        this.#readable = new PushReadableStream((controller) => {
            this.#readableController = controller;
        });

        this.#writable = new WritableStream({
            start: (controller) => {
                this.#writableController = controller;

                // Propagate `readable` error back to `writable`
                const signal = this.#readableController.abortSignal;
                signal.addEventListener("abort", () =>
                    controller.error(signal.reason),
                );
            },
            write: (frame) => {
                this.#captureFrame?.close();
                // `#captureFrame` and `#nextFrame` must not be the same object
                // because they need to be closed at different times
                this.#captureFrame = frame.clone();

                // Frame A is drawing, frame B (`#nextFrame`) is waiting,
                // then frame C (`frame`) arrives.
                // Skip frame B and queue frame C
                if (this.#nextFrame) {
                    this.#nextFrame.close();
                    this.#counter.increaseFramesSkipped();
                }
                this.#nextFrame = frame;

                // Don't `await` because this writable needs to
                // accept incoming frames as fast as produced.
                // The `#draw` method then draws the frames
                // as fast as the renderer can keep up
                void this.#tryStartDrawing();
            },
            close: async () => {
                // Normally `WritableStream` only calls `close` after `write` finishes,
                // but because our `write` doesn't wait for `#draw`,
                // we might still need to send `#nextFrame` to `readable`.
                // So wait for `#drawTask` before closing `readable`
                await this.#drawTask;
                // `#nextFrame` must be `undefined` at this point

                // Propagate `writable` close to `readable`
                this.#readableController.close();

                this.#counter.dispose();

                // Don't close `#captureFrame` to allow using `snapshot` on the last frame
            },
            abort: async (reason) => {
                // See `close` above
                await this.#drawTask;

                // Propagate `writable` error to `readable`
                this.#readableController.error(reason);

                this.#counter.dispose();
            },
        });
    }

    async #draw(): Promise<undefined> {
        // PERF: Draw every frame to minimize latency at cost of performance.
        // When multiple frames are drawn in one vertical sync interval,
        // only the last one is visible to users.
        // But this ensures users can always see the most up-to-date screen.
        // This is also the behavior of official Scrcpy client.
        // https://github.com/Genymobile/scrcpy/issues/3679

        let frame: VideoFrame | undefined;
        while ((frame = this.#nextFrame)) {
            this.#nextFrame = undefined;
            if (await this.#readableController.enqueue(frame)) {
                // The consumer is responsible for closing `frame`
                this.#counter.increaseFramesRendered();
            } else {
                // `enqueue` returning `false` means the consumer has called `readable.cancel()`,
                // before consuming the `frame`. So close it here.
                frame.close();

                // Continue looping to close all `#nextFrame`s
                // In the mean time the `writable` is erroring out its source
                // so no more frames will arrive
            }
        }

        this.#drawTask = undefined;
    }

    #tryStartDrawing() {
        if (!this.#drawTask) {
            this.#drawTask = this.#draw();
        }
    }

    dispose() {
        this.#captureFrame?.close();
        this.#captureFrame = undefined;

        this.#nextFrame?.close();
        this.#nextFrame = undefined;

        this.#counter.dispose();

        tryClose(this.#readableController);

        // Throw an error similar to native TransformStream
        this.#writableController.error(
            new TypeError("The transform stream has been terminated"),
        );
    }
}
