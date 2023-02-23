import { PromiseResolver } from "@yume-chan/async";
import type {
    H264Configuration,
    ScrcpyVideoStreamPacket,
} from "@yume-chan/scrcpy";
import { AndroidCodecLevel, AndroidCodecProfile } from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";
import type { default as YuvBuffer } from "yuv-buffer";
import type { default as YuvCanvas } from "yuv-canvas";

import type { TinyH264Wrapper } from "./wrapper.js";
import { createTinyH264Wrapper } from "./wrapper.js";

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

export class TinyH264Decoder {
    public readonly maxProfile = AndroidCodecProfile.Baseline;

    public readonly maxLevel = AndroidCodecLevel.Level4;

    private _renderer: HTMLCanvasElement;
    public get renderer() {
        return this._renderer;
    }

    private _frameRendered = 0;
    public get frameRendered() {
        return this._frameRendered;
    }

    private _frameSkipped = 0;
    public get frameSkipped() {
        return this._frameSkipped;
    }

    private _writable: WritableStream<ScrcpyVideoStreamPacket>;
    public get writable() {
        return this._writable;
    }

    private _yuvCanvas: YuvCanvas | undefined;
    private _initializer: PromiseResolver<TinyH264Wrapper> | undefined;

    public constructor() {
        void initialize();

        this._renderer = document.createElement("canvas");

        this._writable = new WritableStream<ScrcpyVideoStreamPacket>({
            write: async (packet) => {
                switch (packet.type) {
                    case "configuration":
                        void this.configure(packet.data);
                        break;
                    case "frame": {
                        if (!this._initializer) {
                            throw new Error("Decoder not configured");
                        }

                        const wrapper = await this._initializer.promise;
                        wrapper.feed(packet.data.slice().buffer);
                        break;
                    }
                }
            },
        });
    }

    private async configure(config: H264Configuration) {
        this.dispose();

        this._initializer = new PromiseResolver<TinyH264Wrapper>();
        const { YuvBuffer, YuvCanvas } = await initialize();

        if (!this._yuvCanvas) {
            this._yuvCanvas = YuvCanvas.attach(this._renderer);
        }

        const { encodedWidth, encodedHeight } = config;
        const chromaWidth = encodedWidth / 2;
        const chromaHeight = encodedHeight / 2;

        this._renderer.width = config.croppedWidth;
        this._renderer.height = config.croppedHeight;
        const format = YuvBuffer.format({
            width: encodedWidth,
            height: encodedHeight,
            chromaWidth,
            chromaHeight,
            cropLeft: config.cropLeft,
            cropTop: config.cropTop,
            cropWidth: config.croppedWidth,
            cropHeight: config.croppedHeight,
            displayWidth: config.croppedWidth,
            displayHeight: config.croppedHeight,
        });

        const wrapper = await createTinyH264Wrapper();
        this._initializer.resolve(wrapper);

        const uPlaneOffset = encodedWidth * encodedHeight;
        const vPlaneOffset = uPlaneOffset + chromaWidth * chromaHeight;
        wrapper.onPictureReady(({ data }) => {
            this._frameRendered += 1;
            const array = new Uint8Array(data);
            const frame = YuvBuffer.frame(
                format,
                YuvBuffer.lumaPlane(format, array, encodedWidth, 0),
                YuvBuffer.chromaPlane(format, array, chromaWidth, uPlaneOffset),
                YuvBuffer.chromaPlane(format, array, chromaWidth, vPlaneOffset)
            );
            this._yuvCanvas!.drawFrame(frame);
        });
    }

    public dispose(): void {
        this._initializer?.promise
            .then((wrapper) => wrapper.dispose())
            .catch((e) => {
                void e;
            });
        this._initializer = undefined;
    }
}
