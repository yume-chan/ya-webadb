declare module "yuv-canvas" {
    import type { YUVFrame } from "yuv-buffer";

    export interface YUVCanvasOptions {
        webGL?: boolean | undefined;
    }

    export default class YUVCanvas {
        static attach(
            canvas: HTMLCanvasElement | OffscreenCanvas,
            options?: YUVCanvasOptions,
        ): YUVCanvas;

        drawFrame(data: YUVFrame): void;
    }
}
