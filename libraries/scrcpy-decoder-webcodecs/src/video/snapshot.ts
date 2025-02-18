export class VideoFrameCapturer {
    #canvas: OffscreenCanvas | HTMLCanvasElement;
    #context: ImageBitmapRenderingContext;

    constructor() {
        if (typeof OffscreenCanvas !== "undefined") {
            this.#canvas = new OffscreenCanvas(1, 1);
        } else {
            this.#canvas = document.createElement("canvas");
            this.#canvas.width = 1;
            this.#canvas.height = 1;
        }
        this.#context = this.#canvas.getContext("bitmaprenderer", {
            alpha: false,
        })!;
    }

    async capture(frame: VideoFrame): Promise<Blob> {
        this.#canvas.width = frame.displayWidth;
        this.#canvas.height = frame.displayHeight;

        const bitmap = await createImageBitmap(frame);
        this.#context.transferFromImageBitmap(bitmap);

        if (this.#canvas instanceof OffscreenCanvas) {
            return await this.#canvas.convertToBlob({
                type: "image/png",
            });
        } else {
            return new Promise((resolve, reject) => {
                (this.#canvas as HTMLCanvasElement).toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Failed to convert canvas to blob"));
                    } else {
                        resolve(blob);
                    }
                }, "image/png");
            });
        }
    }
}
