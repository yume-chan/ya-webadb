import { PromiseResolver } from "@yume-chan/async";
import type { ScrcpyMediaStreamPacket } from "@yume-chan/scrcpy";
import {
    AndroidAvcLevel,
    AndroidAvcProfile,
    h264ParseConfiguration,
} from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";
import type { default as YuvBuffer } from "yuv-buffer";
import type { default as YuvCanvas } from "yuv-canvas";

import type {
    ScrcpyVideoDecoder,
    ScrcpyVideoDecoderCapability,
} from "./types.js";
import type { TinyH264Wrapper } from "./wrapper.js";
import { createTinyH264Wrapper } from "./wrapper.js";

const NOOP = () => {
    // no-op
};

let cachedInitializePromise:
    | Promise<{ YuvBuffer: typeof YuvBuffer; YuvCanvas: typeof YuvCanvas }>
    | undefined;
function initialize() {
    if (!cachedInitializePromise) {
        cachedInitializePromise = Promise.all([
            import("yuv-buffer"),
            import("yuv-canvas"),
        ]).then(([YuvBuffer, { default: YuvCanvas }]) => ({
            YuvBuffer,
            YuvCanvas,
        }));
    }

    return cachedInitializePromise;
}

export class TinyH264Decoder implements ScrcpyVideoDecoder {
    static readonly capabilities: Record<string, ScrcpyVideoDecoderCapability> =
        {
            h264: {
                maxProfile: AndroidAvcProfile.Baseline,
                maxLevel: AndroidAvcLevel.Level4,
            },
        };

    #renderer: HTMLCanvasElement;
    get renderer() {
        return this.#renderer;
    }

    #frameRendered = 0;
    get frameRendered() {
        return this.#frameRendered;
    }

    #frameSkipped = 0;
    get frameSkipped() {
        return this.#frameSkipped;
    }

    #writable: WritableStream<ScrcpyMediaStreamPacket>;
    get writable() {
        return this.#writable;
    }

    #yuvCanvas: YuvCanvas | undefined;
    #initializer: PromiseResolver<TinyH264Wrapper> | undefined;

    constructor() {
        void initialize();

        this.#renderer = document.createElement("canvas");

        this.#writable = new WritableStream<ScrcpyMediaStreamPacket>({
            write: async (packet) => {
                switch (packet.type) {
                    case "configuration":
                        await this.#configure(packet.data);
                        break;
                    case "data": {
                        if (!this.#initializer) {
                            throw new Error("Decoder not configured");
                        }

                        const wrapper = await this.#initializer.promise;
                        wrapper.feed(packet.data.slice().buffer);
                        break;
                    }
                }
            },
        });
    }

    async #configure(data: Uint8Array) {
        this.dispose();

        this.#initializer = new PromiseResolver<TinyH264Wrapper>();
        const { YuvBuffer, YuvCanvas } = await initialize();

        if (!this.#yuvCanvas) {
            this.#yuvCanvas = YuvCanvas.attach(this.#renderer);
        }

        const {
            encodedWidth,
            encodedHeight,
            croppedWidth,
            croppedHeight,
            cropLeft,
            cropTop,
        } = h264ParseConfiguration(data);

        // H.264 Baseline profile only supports YUV 420 pixel format
        const chromaWidth = encodedWidth / 2;
        const chromaHeight = encodedHeight / 2;

        // YUVCanvas will set canvas size when format changes
        const format = YuvBuffer.format({
            width: encodedWidth,
            height: encodedHeight,
            chromaWidth,
            chromaHeight,
            cropLeft: cropLeft,
            cropTop: cropTop,
            cropWidth: croppedWidth,
            cropHeight: croppedHeight,
            displayWidth: croppedWidth,
            displayHeight: croppedHeight,
        });

        const wrapper = await createTinyH264Wrapper();
        this.#initializer.resolve(wrapper);

        const uPlaneOffset = encodedWidth * encodedHeight;
        const vPlaneOffset = uPlaneOffset + chromaWidth * chromaHeight;
        wrapper.onPictureReady(({ data }) => {
            this.#frameRendered += 1;
            const array = new Uint8Array(data);
            const frame = YuvBuffer.frame(
                format,
                YuvBuffer.lumaPlane(format, array, encodedWidth, 0),
                YuvBuffer.chromaPlane(format, array, chromaWidth, uPlaneOffset),
                YuvBuffer.chromaPlane(format, array, chromaWidth, vPlaneOffset),
            );
            this.#yuvCanvas!.drawFrame(frame);
        });

        wrapper.feed(data.slice().buffer);
    }

    dispose(): void {
        this.#initializer?.promise
            .then((wrapper) => wrapper.dispose())
            // NOOP: It's disposed so nobody cares about the error
            .catch(NOOP);
        this.#initializer = undefined;
    }
}
