import type { H264Decoder } from "..";
import type { FrameSize } from '../../client';
import { AndroidCodecLevel, AndroidCodecProfile } from "../../codec";
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
    public get element() { return this._element; }

    private _yuvCanvas: import('yuv-canvas').default | undefined;
    private _wrapperInitializePromise: Promise<TinyH264Wrapper> | undefined;

    public constructor() {
        initialize();
        this._element = document.createElement('canvas');
    }

    public async setSize(size: FrameSize) {
        const { YuvBuffer, YuvCanvas } = await initialize();

        if (!this._yuvCanvas) {
            this._yuvCanvas = YuvCanvas.attach(this._element);;
        }

        const { width, height } = size;
        const chromaWidth = width / 2;
        const chromaHeight = height / 2;

        this._element.width = size.croppedWidth;
        this._element.height = size.croppedHeight;
        const format = YuvBuffer.format({
            width,
            height,
            chromaWidth,
            chromaHeight,
            cropLeft: size.cropLeft,
            cropTop: size.cropTop,
            cropWidth: size.croppedWidth,
            cropHeight: size.croppedHeight,
            displayWidth: size.croppedWidth,
            displayHeight: size.croppedHeight,
        });

        this._wrapperInitializePromise?.then(wrapper => wrapper.dispose());
        this._wrapperInitializePromise = createTinyH264Wrapper();
        const wrapper = await this._wrapperInitializePromise;

        const uPlaneOffset = width * height;
        const vPlaneOffset = uPlaneOffset + chromaWidth * chromaHeight;
        wrapper.onPictureReady(({ data }) => {
            const array = new Uint8Array(data);
            const frame = YuvBuffer.frame(format,
                YuvBuffer.lumaPlane(format, array, width, 0),
                YuvBuffer.chromaPlane(format, array, chromaWidth, uPlaneOffset),
                YuvBuffer.chromaPlane(format, array, chromaWidth, vPlaneOffset)
            );
            this._yuvCanvas!.drawFrame(frame);
        });
    }

    public async feed(data: ArrayBuffer) {
        if (!this._wrapperInitializePromise) {
            throw new Error('Decoder not initialized');
        }

        const wrapper = await this._wrapperInitializePromise;
        wrapper.feed(data);
    }

    public dispose(): void {
        this._wrapperInitializePromise?.then(wrapper => wrapper.dispose());
    }
}
