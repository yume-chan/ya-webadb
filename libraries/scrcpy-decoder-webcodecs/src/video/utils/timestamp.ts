import type { PauseController } from "@yume-chan/scrcpy-decoder-tinyh264";
import { TransformStream } from "@yume-chan/stream-extra";

import type { CodecTransformStream } from "../codec/type.js";

const view = new DataView(new ArrayBuffer(8));

function nextUp(x: number) {
    if (Number.isNaN(x) || x === Infinity) return x;
    if (x === 0) return Number.MIN_VALUE;

    // Write the number as a float64
    view.setFloat64(0, x, false);

    let bits = view.getBigUint64(0, false);

    // If x > 0, increment bits; if x < 0, decrement bits
    bits += x > 0 ? 1n : -1n;

    view.setBigUint64(0, bits, false);
    return view.getFloat64(0, false);
}

let prevValue = 0;

export function increasingNow() {
    let now = performance.now();
    if (now <= prevValue) {
        now = nextUp(prevValue);
    }
    prevValue = now;
    return now;
}

export class TimestampTransforms {
    /**
     * Timestamp of the last frame to be skipped by pause controller.
     */
    #skipFramesUntil = 0;

    #addTimestamp = new TransformStream<
        PauseController.Output,
        CodecTransformStream.Input
    >({
        transform: (packet, controller) => {
            if (packet.type === "configuration") {
                controller.enqueue(packet);
                return;
            }

            // Use `timestamp` to convey `skipRendering` to later step
            // and track total decoding time
            const timestamp = increasingNow();

            if (packet.skipRendering) {
                this.#skipFramesUntil = timestamp;
            }

            controller.enqueue({
                ...packet,
                timestamp,
            });
        },
    });
    get addTimestamp() {
        return this.#addTimestamp;
    }

    // This is not in `VideoDecoderStream` because
    // this time includes all pre-processing time,
    // and requires `EncodedVideoChunk.timestamp` to contain
    // local time of when the frame is received,
    // which is set by this class.
    #totalDecodeTime = 0;
    /**
     * Gets the total time spent processing and decoding frames in milliseconds.
     */
    get totalDecodeTime() {
        return this.#totalDecodeTime;
    }

    #consumeTimestamp = new TransformStream<VideoFrame, VideoFrame>({
        transform: (frame, controller) => {
            // `frame.timestamp` is the same `EncodedVideoChunk.timestamp` set above
            this.#totalDecodeTime += performance.now() - frame.timestamp;

            // Don't count these frames as skipped rendering
            if (frame.timestamp <= this.#skipFramesUntil) {
                frame.close();
                return;
            }

            controller.enqueue(frame);
        },
    });
    get consumeTimestamp() {
        return this.#consumeTimestamp;
    }
}
