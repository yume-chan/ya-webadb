import type { Decoder, FlushResult, Picture } from "@yume-chan/h264bsd";
import initialize from "@yume-chan/h264bsd";
import { ScrcpyVideoSizeImpl } from "@yume-chan/scrcpy";
import YUVCanvas from "yuv-canvas";

const Module = await initialize();

export class DecoderRenderer {
    #decoder: Decoder;

    #renderer: YUVCanvas;

    #size: ScrcpyVideoSizeImpl;

    constructor(
        canvas: HTMLCanvasElement | OffscreenCanvas,
        webGl: boolean,
        onSizeChanged: (size: { width: number; height: number }) => void,
    ) {
        this.#decoder = new Module.Decoder();

        // yuv-canvas supports detecting WebGL support by creating a <canvas> itself
        // But this doesn't work in Web Worker (with OffscreenCanvas)
        // so we implement our own check here
        this.#renderer = YUVCanvas.attach(canvas, { webGL: webGl });

        this.#size = new ScrcpyVideoSizeImpl();
        this.#size.sizeChanged(onSizeChanged);
    }

    #draw(picture: Picture) {
        const width = picture.info.picWidth;
        const height = picture.info.picHeight;

        this.#size.setSize(width, height);

        const chromaWidth = width / 2;
        const chromaHeight = height / 2;

        const uOffset = width * height;
        const vOffset = uOffset + chromaWidth * chromaHeight;

        this.#renderer.drawFrame({
            format: {
                width,
                height,
                chromaWidth,
                chromaHeight,
                cropLeft: picture.info.cropParams.cropLeftOffset,
                cropWidth: picture.info.cropParams.cropOutWidth,
                cropTop: picture.info.cropParams.cropTopOffset,
                cropHeight: picture.info.cropParams.cropOutHeight,
                displayWidth: picture.info.cropParams.cropOutWidth,
                displayHeight: picture.info.cropParams.cropOutHeight,
            },
            y: {
                bytes: picture.bytes.subarray(0, uOffset),
                stride: width,
            },
            u: {
                bytes: picture.bytes.subarray(uOffset, vOffset),
                stride: chromaWidth,
            },
            v: {
                bytes: picture.bytes.subarray(vOffset),
                stride: chromaWidth,
            },
        });
    }

    #getLastPicture(result: FlushResult): [number, Picture | undefined] {
        let { picture } = result;
        if (picture) {
            for (let i = 0; i < result.extraPictureCount; i += 1) {
                picture = this.#decoder.getNextPicture()!;
            }
            return [result.extraPictureCount + 1, picture];
        }
        return [0, undefined];
    }

    decode(data: Uint8Array, skipRendering: boolean) {
        let offset = 0;
        let length = data.length;
        let picture: Picture | undefined;

        let framesDecoded = 0;

        while (length) {
            const result = this.#decoder.decode(data.subarray(offset), 0);
            if (result.code >= Module.DecodeResultCode.Error) {
                throw new Error("Decode failed. Code: " + result.code);
            }

            let pictureCount: number;
            [pictureCount, picture] = this.#getLastPicture(result);
            framesDecoded += pictureCount;

            offset += result.read;
            length -= result.read;
        }

        if (!picture || skipRendering) {
            return framesDecoded;
        }

        this.#draw(picture);

        return framesDecoded;
    }

    flush(skipRendering: boolean) {
        const result = this.#decoder.flush();
        const [pictureCount, picture] = this.#getLastPicture(result);
        if (picture && !skipRendering) {
            this.#draw(picture);
        }
        return pictureCount;
    }

    dispose() {
        this.#decoder.delete();
    }
}
