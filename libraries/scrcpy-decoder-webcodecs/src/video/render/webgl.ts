// cspell: ignore highp
// cspell: ignore mediump

import {
    glCreateContext,
    glIsSupported,
    glLoseContext,
} from "@yume-chan/scrcpy-decoder-tinyh264";

import { CanvasVideoFrameRenderer } from "./canvas.js";
import { RedrawController } from "./redraw.js";

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
    static VertexShader = `
        attribute vec2 xy;

        varying highp vec2 uv;

        void main(void) {
            gl_Position = vec4(xy, 0.0, 1.0);

            // Map vertex coordinates (-1 to +1) to UV coordinates (0 to 1).
            uv = xy * 0.5 + 0.5;
            // UV coordinates are Y-flipped relative to vertex coordinates.
            uv.y = 1.0 - uv.y;
        }
`;

    static FragmentShader = `
        precision mediump float;

        uniform sampler2D source;
        uniform vec2 texelSize;
        uniform float zoom;

        varying vec2 uv;

        vec4 tent4(vec2 uv) {
            vec2 dx = vec2(texelSize.x, 0.0);
            vec2 dy = vec2(0.0, texelSize.y);

            vec4 c0 = texture2D(source, uv);
            vec4 c1 = texture2D(source, uv + dx);
            vec4 c2 = texture2D(source, uv + dy);
            vec4 c3 = texture2D(source, uv + dx + dy);

            return 0.25 * (c0 + c1 + c2 + c3);
        }

        vec4 gaussian9(vec2 uv) {
            vec2 dx = vec2(texelSize.x, 0.0);
            vec2 dy = vec2(0.0, texelSize.y);

            vec4 sum = vec4(0.0);
            sum += texture2D(source, uv) * 0.227027;
            sum += texture2D(source, uv + dx) * 0.1945946;
            sum += texture2D(source, uv - dx) * 0.1945946;
            sum += texture2D(source, uv + dy) * 0.1945946;
            sum += texture2D(source, uv - dy) * 0.1945946;

            return sum;
        }

        void main() {
            if (zoom < 0.6) {
                gl_FragColor = tent4(uv);
            } else if (zoom < 0.9) {
                gl_FragColor = gaussian9(uv);
            } else {
                // Near 1:1, just sample directly
                gl_FragColor = texture2D(source, uv);
            }
        }
`;

    /**
     * A single oversized triangle that covers the entire canvas.
     */
    static Vertices = new Float32Array([-1.0, -1.0, 3.0, -1.0, -1.0, 3.0]);

    static get isSupported() {
        return glIsSupported({
            // Disallow software rendering.
            // `ImageBitmapRenderingContext` is faster than software-based WebGL.
            failIfMajorPerformanceCaveat: true,
        });
    }

    #context: WebGLRenderingContext;
    #program!: WebGLProgram;

    #controller = new RedrawController((frame): undefined => {
        const gl = this.#context;
        if (gl.isContextLost()) {
            return;
        }

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            frame,
        );

        const texelSizeLocation = gl.getUniformLocation(
            this.#program,
            "texelSize",
        );
        gl.uniform2f(
            texelSizeLocation,
            1.0 / frame.codedWidth,
            1.0 / frame.codedHeight,
        );

        const zoomLocation = gl.getUniformLocation(this.#program, "zoom");
        gl.uniform1f(zoomLocation, this.canvas.width / frame.codedWidth);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        gl.flush();
    });

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
            WebGLVideoFrameRenderer.VertexShader,
            WebGLVideoFrameRenderer.FragmentShader,
        );
        gl.useProgram(this.#program);

        // Vertex coordinates, clockwise from bottom-left.
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            WebGLVideoFrameRenderer.Vertices,
            gl.STATIC_DRAW,
        );

        const xyLocation = gl.getAttribLocation(this.#program, "xy");
        gl.vertexAttribPointer(xyLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(xyLocation);

        // Create one texture to upload frames to.
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    #handleContextLost = (e: Event) => {
        // Notify WebGL we want to handle context restoration
        e.preventDefault();
    };

    #handleContextRestored = () => {
        this.#initialize();
        this.#controller.redraw();
    };

    override draw(frame: VideoFrame) {
        return this.#controller.draw(frame);
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
         * Enabling this option may reduce performance.
         */
        enableCapture?: boolean;
    }
}
