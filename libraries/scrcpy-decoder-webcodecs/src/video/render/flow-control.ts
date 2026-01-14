import type { ScrcpyVideoDecoderPerformanceCounter } from "@yume-chan/scrcpy-decoder-tinyh264";
import { PerformanceCounter } from "@yume-chan/scrcpy-decoder-tinyh264";
import type {
    PushReadableStreamController,
    ReadableStream,
    TransformStream,
    WritableStreamDefaultController,
} from "@yume-chan/stream-extra";
import { PushReadableStream, WritableStream } from "@yume-chan/stream-extra";

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

    #drawing = false;

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
    get framesPresented() {
        return this.#counter.framesPresented;
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
                void this.#draw();
            },
            close: () => {
                this.#readableController.close();
                this.#counter.dispose();
                // Don't close `#captureFrame` to allow using `snapshot` on the last frame
                // Don't close `#nextFrame` to make sure all frames are rendered
            },
            abort: (reason) => {
                this.#readableController.error(reason);
                this.#counter.dispose();
                // Don't close `#captureFrame` to allow using `snapshot` on the last frame
                // Don't close `#nextFrame` to make sure all frames are rendered
            },
        });
    }

    async #draw() {
        if (this.#drawing) {
            return;
        }
        this.#drawing = true;

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
                frame.close();
            }
        }

        this.#drawing = false;
    }

    dispose() {
        this.#captureFrame?.close();
        this.#captureFrame = undefined;

        this.#nextFrame?.close();
        this.#nextFrame = undefined;

        this.#counter.dispose();

        this.#readableController.close();
        // Throw a similar error to native TransformStream
        this.#writableController.error(
            new TypeError("The transform stream has been terminated"),
        );
    }
}
