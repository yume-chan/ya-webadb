// cspell: ignore highp
// cspell: ignore mediump

import {
    glCreateContext,
    glIsSupported,
    glLoseContext,
} from "@yume-chan/scrcpy-decoder-tinyh264";

import { CanvasVideoFrameRenderer } from "./canvas.js";

const Resolved = Promise.resolve();

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function createProgram(
    gl: WebGLRenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentShaderSource,
    );

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    try {
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return program;
        }

        // Don't check shader compile status unless linking fails
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#dont_check_shader_compile_status_unless_linking_fails
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vertexShader)!);
        }

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fragmentShader)!);
        }

        throw new Error(gl.getProgramInfoLog(program)!);
    } finally {
        // Delete objects eagerly
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#delete_objects_eagerly
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }
}

export class WebGLVideoFrameRenderer extends CanvasVideoFrameRenderer<WebGLVideoFrameRenderer.Options> {
    static VertexShaderSource = `
        attribute vec2 xy;

        varying highp vec2 uv;

        void main(void) {
            gl_Position = vec4(xy, 0.0, 1.0);
            // Map vertex coordinates (-1 to +1) to UV coordinates (0 to 1).
            // UV coordinates are Y-flipped relative to vertex coordinates.
            uv = vec2((1.0 + xy.x) / 2.0, (1.0 - xy.y) / 2.0);
        }
`;

    static FragmentShaderSource = `
        precision mediump float;

        varying highp vec2 uv;
        uniform sampler2D texture;

        void main(void) {
            gl_FragColor = texture2D(texture, uv);
        }
`;

    static get isSupported() {
        return glIsSupported({
            // Disallow software rendering.
            // `ImageBitmapRenderingContext` is faster than software-based WebGL.
            failIfMajorPerformanceCaveat: true,
        });
    }

    #context: WebGLRenderingContext;
    #program!: WebGLProgram;

    #lastFrame?: VideoFrame;

    /**
     * Create a new WebGL frame renderer.
     * @param canvas The canvas to render frames to.
     * @param enableCapture
     * Whether to allow capturing the canvas content using APIs like `readPixels` and `toDataURL`.
     * Enable this option may reduce performance.
     */
    constructor(
        canvas?: HTMLCanvasElement | OffscreenCanvas,
        options?: WebGLVideoFrameRenderer.Options,
    ) {
        super(canvas, options);

        const gl = glCreateContext(this.canvas, {
            // Low-power GPU should be enough for video rendering.
            powerPreference: "low-power",
            // Avoid alpha:false, which can be expensive
            // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_alphafalse_which_can_be_expensive
            alpha: true,
            // Disallow software rendering.
            // `ImageBitmapRenderingContext` is faster than software-based WebGL.
            failIfMajorPerformanceCaveat: true,
            preserveDrawingBuffer: !!this.options?.enableCapture,
            // Enable desynchronized mode when not capturing to reduce latency.
            desynchronized: !this.options?.enableCapture,
            antialias: false,
            depth: false,
            premultipliedAlpha: true,
            stencil: false,
        });
        if (!gl) {
            throw new Error("WebGL not supported, check `isSupported` first");
        }
        this.#context = gl;

        this.#initialize();

        this.canvas.addEventListener(
            "webglcontextlost",
            this.#handleContextLost,
        );
        this.canvas.addEventListener(
            "webglcontextrestored",
            this.#handleContextRestored,
        );
    }

    #initialize() {
        const gl = this.#context;

        this.#program = createProgram(
            gl,
            WebGLVideoFrameRenderer.VertexShaderSource,
            WebGLVideoFrameRenderer.FragmentShaderSource,
        );
        gl.useProgram(this.#program);

        // Vertex coordinates, clockwise from bottom-left.
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1.0, -1.0, -1.0, +1.0, +1.0, +1.0, +1.0, -1.0]),
            gl.STATIC_DRAW,
        );

        const xyLocation = gl.getAttribLocation(this.#program, "xy");
        gl.vertexAttribPointer(xyLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(xyLocation);

        // Create one texture to upload frames to.
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            // WebGL 1 doesn't support mipmaps for non-power-of-two textures
            gl instanceof WebGL2RenderingContext
                ? gl.NEAREST_MIPMAP_LINEAR
                : gl.NEAREST,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    #handleContextLost = (e: Event) => {
        // Notify WebGL we want to handle context restoration
        e.preventDefault();
    };

    #handleContextRestored = () => {
        this.#initialize();
        if (this.#lastFrame) {
            void this.draw(this.#lastFrame);
        }
    };

    override draw(frame: VideoFrame): Promise<void> {
        // Will be clsoed by `CanvasVideoFrameRenderer`
        this.#lastFrame = frame;

        const gl = this.#context;
        if (gl.isContextLost()) {
            return Resolved;
        }

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            frame,
        );

        // WebGL 1 doesn't support mipmaps for non-power-of-two textures
        if (gl instanceof WebGL2RenderingContext) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.flush();

        return Resolved;
    }

    override dispose(): undefined {
        this.#context.deleteProgram(this.#program);

        this.canvas.removeEventListener(
            "webglcontextlost",
            this.#handleContextLost,
        );
        this.canvas.removeEventListener(
            "webglcontextrestored",
            this.#handleContextRestored,
        );

        // Lose contexts eagerly
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#lose_contexts_eagerly
        glLoseContext(this.#context);

        super.dispose();
    }
}

export namespace WebGLVideoFrameRenderer {
    export interface Options extends CanvasVideoFrameRenderer.Options {
        /**
         * Whether to allow capturing the canvas content using APIs like `readPixels` and `toDataURL`.
         *
         * Enable this option may reduce performance.
         */
        enableCapture?: boolean;
    }
}
