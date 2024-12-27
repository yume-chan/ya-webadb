import { createCanvas } from "@yume-chan/scrcpy-decoder-tinyh264";

import { CanvasVideoFrameRenderer } from "./canvas.js";

const Resolved = Promise.resolve();

function createContext(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    enableCapture?: boolean,
): WebGLRenderingContext | null {
    const attributes: WebGLContextAttributes = {
        // Low-power GPU should be enough for video rendering.
        powerPreference: "low-power",
        alpha: false,
        // Disallow software rendering.
        // Other rendering methods are faster than software-based WebGL.
        failIfMajorPerformanceCaveat: true,
        preserveDrawingBuffer: !!enableCapture,
    };

    return (
        canvas.getContext("webgl2", attributes) ||
        canvas.getContext("webgl", attributes)
    );
}

export class WebGLVideoFrameRenderer extends CanvasVideoFrameRenderer {
    static vertexShaderSource = `
        attribute vec2 xy;

        varying highp vec2 uv;

        void main(void) {
            gl_Position = vec4(xy, 0.0, 1.0);
            // Map vertex coordinates (-1 to +1) to UV coordinates (0 to 1).
            // UV coordinates are Y-flipped relative to vertex coordinates.
            uv = vec2((1.0 + xy.x) / 2.0, (1.0 - xy.y) / 2.0);
        }
`;

    static fragmentShaderSource = `
        varying highp vec2 uv;

        uniform sampler2D texture;

        void main(void) {
            gl_FragColor = texture2D(texture, uv);
        }
`;

    static get isSupported() {
        const canvas = createCanvas();
        return !!createContext(canvas);
    }

    #context: WebGLRenderingContext;

    /**
     * Create a new WebGL frame renderer.
     * @param canvas The canvas to render frames to.
     * @param enableCapture
     * Whether to allow capturing the canvas content using APIs like `readPixels` and `toDataURL`.
     * Enable this option may reduce performance.
     */
    constructor(
        canvas?: HTMLCanvasElement | OffscreenCanvas,
        enableCapture?: boolean,
    ) {
        super(canvas);

        const gl = createContext(this.canvas, enableCapture);
        if (!gl) {
            throw new Error("WebGL not supported");
        }
        this.#context = gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(
            vertexShader,
            WebGLVideoFrameRenderer.vertexShaderSource,
        );
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vertexShader)!);
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(
            fragmentShader,
            WebGLVideoFrameRenderer.fragmentShaderSource,
        );
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fragmentShader)!);
        }

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(shaderProgram)!);
        }
        gl.useProgram(shaderProgram);

        // Vertex coordinates, clockwise from bottom-left.
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1.0, -1.0, -1.0, +1.0, +1.0, +1.0, +1.0, -1.0]),
            gl.STATIC_DRAW,
        );

        const xyLocation = gl.getAttribLocation(shaderProgram, "xy");
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

    draw(frame: VideoFrame): Promise<void> {
        const gl = this.#context;
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            frame,
        );

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        return Resolved;
    }
}
