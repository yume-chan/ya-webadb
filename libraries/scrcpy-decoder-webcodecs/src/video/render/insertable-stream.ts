// cspell: ignore insertable

import type { MaybePromiseLike } from "@yume-chan/async";
import type { WritableStreamDefaultWriter } from "@yume-chan/stream-extra";
import { tryClose } from "@yume-chan/stream-extra";

import type { VideoFrameRenderer } from "./type.js";

declare class MediaStreamTrackGenerator extends MediaStreamTrack {
    constructor(options: { kind: "audio" | "video" });

    writable: WritableStream<VideoFrame>;
}

export class InsertableStreamVideoFrameRenderer implements VideoFrameRenderer {
    static get isSupported() {
        return typeof MediaStreamTrackGenerator !== "undefined";
    }

    #element: HTMLVideoElement;
    get element() {
        return this.#element;
    }

    #generator: MediaStreamTrackGenerator;
    #writer: WritableStreamDefaultWriter<VideoFrame>;
    #stream: MediaStream;

    constructor(element?: HTMLVideoElement) {
        if (element) {
            this.#element = element;
        } else if (typeof document !== "undefined") {
            this.#element = document.createElement("video");
        } else {
            throw new Error(
                "no video element input found nor any video element can be created",
            );
        }
        this.#element.muted = true;
        this.#element.autoplay = true;
        this.#element.playsInline = true;
        this.#element.disablePictureInPicture = true;
        this.#element.disableRemotePlayback = true;

        // The spec replaced `MediaStreamTrackGenerator` with `VideoTrackGenerator`.
        // But Chrome has not implemented it yet.
        // https://issues.chromium.org/issues/40058895
        this.#generator = new MediaStreamTrackGenerator({ kind: "video" });
        this.#generator.contentHint = "motion";

        this.#writer =
            this.#generator.writable.getWriter() as WritableStreamDefaultWriter<VideoFrame>;

        this.#stream = new MediaStream([this.#generator]);
        this.#element.srcObject = this.#stream;
    }

    setSize(width: number, height: number): void {
        if (this.#element.width !== width || this.#element.height !== height) {
            this.#element.width = width;
            this.#element.height = height;
        }
    }

    draw(frame: VideoFrame): Promise<void> {
        return this.#writer.write(frame);
    }

    dispose(): MaybePromiseLike<undefined> {
        tryClose(this.#writer);
        return undefined;
    }
}
