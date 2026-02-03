// cspell: ignore highp
// cspell: ignore mediump

import {
    glCreateContext,
    glIsSupported,
    glLoseContext,
} from "@yume-chan/scrcpy-decoder-tinyh264";

import { CanvasVideoFrameRenderer } from "./canvas.js";

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

        float mnWeight(float x) {
            x = abs(x);
            float x2 = x * x;
            float x3 = x2 * x;

            if (x < 1.0) {
                return (1.0/6.0) * ((12.0 - 9.0 * (1.0/3.0) - 6.0 * (1.0/3.0)) * x3 +
                                    (-18.0 + 12.0 * (1.0/3.0) + 6.0 * (1.0/3.0)) * x2 +
                                    (6.0 - 2.0 * (1.0/3.0)));
            } else if (x < 2.0) {
                return (1.0/6.0) * ((- (1.0/3.0) - 6.0 * (1.0/3.0)) * x3 +
                                    ((6.0 * (1.0/3.0) + 30.0 * (1.0/3.0)) * x2 +
                                    (-12.0 * (1.0/3.0) - 48.0 * (1.0/3.0)) * x +
                                    (8.0 * (1.0/3.0) + 24.0 * (1.0/3.0))));
            }
            return 0.0;
        }

        vec4 bicubicMN(vec2 uv, vec2 texelSize) {
            vec2 texCoord = uv / texelSize;
            vec2 base = floor(texCoord - 0.5);
            vec2 f = texCoord - base - 0.5;

            vec4 sum = vec4(0.0);
            float total = 0.0;

            for (int j = -1; j <= 2; j++) {
                float wy = mnWeight(float(j) - f.y);
                for (int i = -1; i <= 2; i++) {
                    float wx = mnWeight(float(i) - f.x);
                    float w = wx * wy;

                    vec2 coord = (base + vec2(float(i), float(j)) + 0.5) * texelSize;
                    sum += texture2D(source, coord) * w;
                    total += w;
                }
            }
            return sum / total;
        }

        void main() {
            if (zoom > 0.95) {
                gl_FragColor = texture2D(source, uv);
            }
            else if (zoom > 0.5) {
                gl_FragColor = bicubicMN(uv, texelSize);
            }
            else {
                gl_FragColor = tent4(uv);
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

    override get type() {
        return "hardware" as const;
    }

    #context: WebGLRenderingContext;
    #program!: WebGLProgram;
    #vertexBuffer!: WebGLBuffer;
    #texture!: WebGLTexture;
    #texelSizeLocation!: WebGLUniformLocation;
    #zoomLocation!: WebGLUniformLocation;

    /**
     * Create a new WebGL frame renderer.
     * @param canvas The canvas to render frames to.
     * @param enableCapture
     * Whether to allow capturing the canvas content using APIs like `readPixels` and `toDataURL`.
     * Enable this option may reduce performance.
     */
    constructor(options?: WebGLVideoFrameRenderer.Options) {
        super((frame): undefined => {
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

            gl.uniform2f(
                this.#texelSizeLocation,
                1.0 / frame.codedWidth,
                1.0 / frame.codedHeight,
            );

            gl.uniform1f(
                this.#zoomLocation,
                this.canvas.width / frame.codedWidth,
            );

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            gl.flush();
        }, options);

        const gl = glCreateContext(this.canvas, {
            // Low-power GPU should be enough for video rendering.
            // Note that `OffscreenCanvas` created in Web Workers can only use `low-power` anyway.
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
        this.#vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            WebGLVideoFrameRenderer.Vertices,
            gl.STATIC_DRAW,
        );

        const xyLocation = gl.getAttribLocation(this.#program, "xy");
        gl.vertexAttribPointer(xyLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(xyLocation);

        this.#texelSizeLocation = gl.getUniformLocation(
            this.#program,
            "texelSize",
        )!;
        this.#zoomLocation = gl.getUniformLocation(this.#program, "zoom")!;

        // Create one texture to upload frames to.
        this.#texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#texture);
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
        void this.redraw();
    };

    override async snapshot(
        options?: ImageEncodeOptions,
    ): Promise<Blob | undefined> {
        if (!this.options?.enableCapture) {
            return undefined;
        }
        return super.snapshot(options);
    }

    override dispose(): undefined {
        this.#context.deleteBuffer(this.#vertexBuffer);
        this.#context.deleteTexture(this.#texture);
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
