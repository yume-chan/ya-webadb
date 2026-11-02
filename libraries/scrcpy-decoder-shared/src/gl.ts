export function createCanvas() {
    if (typeof document !== "undefined") {
        return document.createElement("canvas");
    }
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(1, 1);
    }
    throw new Error("no canvas input found nor any canvas can be created");
}

export function glCreateContext(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    attributes?: WebGLContextAttributes,
): WebGLRenderingContext | WebGL2RenderingContext | null {
    // `HTMLCanvasElement.getContext` returns `null` for unsupported `contextId`,
    // but `OffscreenCanvas.getContext` will throw errors,
    // Support both cases using both `try...catch...` and `if`

    try {
        const context = canvas.getContext(
            "webgl2",
            attributes,
        ) as WebGL2RenderingContext | null;

        if (context) {
            return context;
        }
    } catch {
        // ignore
    }

    try {
        const context = canvas.getContext(
            "webgl",
            attributes,
        ) as WebGLRenderingContext | null;

        if (context) {
            return context;
        }
    } catch {
        // ignore
    }

    // Support very old browsers just in case
    // `OffscreenCanvas` doesn't support `experimental-webgl`
    if (canvas instanceof HTMLCanvasElement) {
        const context = canvas.getContext(
            "experimental-webgl",
            attributes,
        ) as WebGLRenderingContext | null;

        if (context) {
            return context;
        }
    }

    return null;
}

export function glLoseContext(context: WebGLRenderingContext) {
    try {
        context.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
        // ignore
    }
}

export function glIsSupported(attributes?: WebGLContextAttributes): boolean {
    const canvas = createCanvas();

    const gl = glCreateContext(canvas, attributes);
    if (gl) {
        glLoseContext(gl);
    }

    return !!gl;
}
