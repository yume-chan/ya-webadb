import { PromiseResolver } from "@yume-chan/async";
import type { H264Decoder } from "..";
import { AndroidCodecLevel, AndroidCodecProfile } from "../../codec";
import type { H264EncodingInfo } from '../../options';
import { createTinyH264Wrapper, TinyH264Wrapper } from "./wrapper";

let cachedInitializePromise: Promise<{ YuvBuffer: typeof import('yuv-buffer'), YuvCanvas: typeof import('yuv-canvas').default; }> | undefined;
function initialize() {
    if (!cachedInitializePromise) {
        cachedInitializePromise = Promise.all(
            [import('yuv-buffer'), import('yuv-canvas')]
        ).then(([YuvBuffer, { default: YuvCanvas }]) => ({
            YuvBuffer, YuvCanvas
        }));
    }

    return cachedInitializePromise;
}

export class TinyH264Decoder implements H264Decoder {
    public readonly maxProfile = AndroidCodecProfile.Baseline;

    public readonly maxLevel = AndroidCodecLevel.Level4;

    private _element: HTMLCanvasElement;
    public get renderer() { return this._element; }

    private _yuvCanvas: import('yuv-canvas').default | undefined;
    private _initializer: PromiseResolver<TinyH264Wrapper> | undefined;

    public constructor() {
        initialize();
        this._element = document.createElement('canvas');
    }

    public async changeEncoding(size: H264EncodingInfo) {
        this.dispose();

        this._initializer = new PromiseResolver<TinyH264Wrapper>();
        const { YuvBuffer, YuvCanvas } = await initialize();

        if (!this._yuvCanvas) {
            this._yuvCanvas = YuvCanvas.attach(this._element);;
        }

        const { encodedWidth, encodedHeight } = size;
        const chromaWidth = encodedWidth / 2;
        const chromaHeight = encodedHeight / 2;

        this._element.width = size.croppedWidth;
        this._element.height = size.croppedHeight;
        const format = YuvBuffer.format({
            width: encodedWidth,
            height: encodedHeight,
            chromaWidth,
            chromaHeight,
            cropLeft: size.cropLeft,
            cropTop: size.cropTop,
            cropWidth: size.croppedWidth,
            cropHeight: size.croppedHeight,
            displayWidth: size.croppedWidth,
            displayHeight: size.croppedHeight,
        });

        const wrapper = await createTinyH264Wrapper();
        this._initializer.resolve(wrapper);

        const uPlaneOffset = encodedWidth * encodedHeight;
        const vPlaneOffset = uPlaneOffset + chromaWidth * chromaHeight;
        wrapper.onPictureReady(({ data }) => {
            const array = new Uint8Array(data);
            const frame = YuvBuffer.frame(format,
                YuvBuffer.lumaPlane(format, array, encodedWidth, 0),
                YuvBuffer.chromaPlane(format, array, chromaWidth, uPlaneOffset),
                YuvBuffer.chromaPlane(format, array, chromaWidth, vPlaneOffset)
            );
            this._yuvCanvas!.drawFrame(frame);
        });
    }

    public async feedData(data: ArrayBuffer) {
        if (!this._initializer) {
            throw new Error('Decoder not initialized');
        }

        const wrapper = await this._initializer.promise;
        wrapper.feed(data);
    }

    public dispose(): void {
        this._initializer?.promise.then(wrapper => wrapper.dispose());
        this._initializer = undefined;
    }
}
