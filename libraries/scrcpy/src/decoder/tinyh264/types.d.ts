declare module 'tinyh264' {
    export function init(): void;
}

declare module 'yuv-buffer' {
    /**
     * Validate and fill out a YUVFormat object structure.
     *
     * At least width and height fields are required; other fields will be
     * derived if left missing or empty:
     * - chromaWidth and chromaHeight will be copied from width and height as for a 4:4:4 layout
     * - cropLeft and cropTop will be 0
     * - cropWidth and cropHeight will be set to whatever of the frame is visible after cropTop and cropLeft are applied
     * - displayWidth and displayHeight will be set to cropWidth and cropHeight.
     *
     * @param {YUVFormat} fields - input fields, must include width and height.
     * @returns {YUVFormat} - validated structure, with all derivable fields filled out.
     * @throws exception on invalid fields or missing width/height
     */
    export function format(fields: YUVFormat): YUVFormat;

    /**
     * Allocate a new YUVPlane object big enough for a luma plane in the given format
     * @param {YUVFormat} format - target frame format
     * @param {Uint8Array} source - input byte array; optional (will create empty buffer if missing)
     * @param {number} stride - row length in bytes; optional (will create a default if missing)
     * @param {number} offset - offset into source array to extract; optional (will start at 0 if missing)
     * @returns {YUVPlane} - freshly allocated planar buffer
     */
    export function lumaPlane(format: YUVFormat, source: Uint8Array, stride: number, offset: number): YUVPlane;

    /**
     * Allocate a new YUVPlane object big enough for a chroma plane in the given format,
     * optionally copying data from an existing buffer.
     *
     * @param {YUVFormat} format - target frame format
     * @param {Uint8Array} source - input byte array; optional (will create empty buffer if missing)
     * @param {number} stride - row length in bytes; optional (will create a default if missing)
     * @param {number} offset - offset into source array to extract; optional (will start at 0 if missing)
     * @returns {YUVPlane} - freshly allocated planar buffer
     */
    export function chromaPlane(format: YUVFormat, source: Uint8Array, stride: number, offset: number): YUVPlane;

    /**
     * Allocate a new YUVFrame object big enough for the given format
     * @param {YUVFormat} format - target frame format
     * @param {YUVPlane} y - optional Y plane; if missing, fresh one will be allocated
     * @param {YUVPlane} u - optional U plane; if missing, fresh one will be allocated
     * @param {YUVPlane} v - optional V plane; if missing, fresh one will be allocated
     * @returns {YUVFrame} - freshly allocated frame buffer
     */
    export function frame(format: YUVFormat, y: YUVPlane, u: YUVPlane, v: YUVPlane): YUVFrame;

    /**
     * Duplicate a frame using new buffer memory.
     * @param {YUVFrame} frame - input frame to copyFrame
     * @returns {YUVFrame} - freshly allocated and filled frame buffer
     */
    export function copyFrame(frame: YUVFrame): YUVFrame;

    /**
     * List the backing buffers for the frame's planes for transfer between
     * threads via Worker.postMessage.
     * @param {YUVFrame} frame - input frame
     * @returns {Array} - list of transferable objects
     */
    export function transferables(frame: YUVFrame): (ArrayBuffer | SharedArrayBuffer)[];


    /**
     * Represents metadata about a YUV frame format.
     * @typedef {Object} YUVFormat
     * @property {number} width - width of encoded frame in luma pixels
     * @property {number} height - height of encoded frame in luma pixels
     * @property {number} chromaWidth - width of encoded frame in chroma pixels
     * @property {number} chromaHeight - height of encoded frame in chroma pixels
     * @property {number} cropLeft - upper-left X coordinate of visible crop region, in luma pixels
     * @property {number} cropTop - upper-left Y coordinate of visible crop region, in luma pixels
     * @property {number} cropWidth - width of visible crop region, in luma pixels
     * @property {number} cropHeight - height of visible crop region, in luma pixels
     * @property {number} displayWidth - final display width of visible region, in luma pixels
     * @property {number} displayHeight - final display height of visible region, in luma pixels
     */
    export interface YUVFormat {
        width: number;
        height: number;
        chromaWidth: number;
        chromaHeight: number;
        cropLeft: number;
        cropTop: number;
        cropWidth: number;
        cropHeight: number;
        displayWidth: number;
        displayHeight: number;
    }

    /**
     * Represents underlying image data for a single luma or chroma plane.
     * Cannot be interpreted without the format data from a frame buffer.
     * @typedef {Object} YUVPlane
     * @property {Uint8Array} bytes - typed array containing image data bytes
     * @property {number} stride - byte distance between rows in data
     */
    export interface YUVPlane {
        bytes: Uint8Array;
        stride: number;
    }

    /**
     * Represents a YUV image frame buffer, with enough format information
     * to interpret the data usefully. Buffer objects use generic objects
     * under the hood and can be transferred between worker threads using
     * the structured clone algorithm.
     *
     * @typedef {Object} YUVFrame
     * @property {YUVFormat} format
     * @property {YUVPlane} y
     * @property {YUVPlane} u
     * @property {YUVPlane} v
     */
    export interface YUVFrame {
        format: YUVFormat;
        y: YUVPlane;
        u: YUVPlane;
        v: YUVPlane;
    }
}

declare module 'yuv-canvas' {
    import { YUVFrame } from 'yuv-buffer';

    export default class YUVCanvas {
        public static attach(canvas: HTMLCanvasElement): YUVCanvas;

        public drawFrame(data: YUVFrame): void;
    }
}
