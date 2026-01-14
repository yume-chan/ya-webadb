export function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas) {
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({
            type: "image/png",
        });
    } else {
        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Failed to convert canvas to blob"));
                } else {
                    resolve(blob);
                }
            }, "image/png");
        });
    }
}
