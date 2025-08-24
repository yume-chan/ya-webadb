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
    // For unknown reason, TypeScript can't correctly infer return type of
    // `(HTMLCanvasElement | OffscreenCanvas).getContext("webgl2")`.
    // so this helper function

    {
        const context = canvas.getContext(
            "webgl2",
            attributes,
        ) as WebGL2RenderingContext | null;

        if (context) {
            return context;
        }
    }

    {
        const context = canvas.getContext(
            "webgl",
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
