// cspell: ignore insertable

import type { WritableStream } from "@yume-chan/stream-extra";

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
    get writable() {
        return this.#generator.writable;
    }

    #stream: MediaStream;
    get stream() {
        return this.#stream;
    }

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

        this.#element.addEventListener("resize", () => {
            this.#element.width = this.#element.videoWidth;
            this.#element.height = this.#element.videoHeight;
        });

        // The spec replaced `MediaStreamTrackGenerator` with `VideoTrackGenerator`.
        // But Chrome has not implemented it yet.
        // https://issues.chromium.org/issues/40058895
        this.#generator = new MediaStreamTrackGenerator({ kind: "video" });
        this.#generator.contentHint = "motion";

        this.#stream = new MediaStream([this.#generator]);
        this.#element.srcObject = this.#stream;
    }
}
