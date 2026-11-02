export function canvasToBlob(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options?: ImageEncodeOptions,
) {
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob(options);
    } else {
        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to convert canvas to blob"));
                    } else {
                        resolve(blob);
                    }
                },
                options?.type,
                options?.quality,
            );
        });
    }
}
