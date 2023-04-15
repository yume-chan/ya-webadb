import { describe, expect, it } from "@jest/globals";

import { BufferedReadableStream } from "./buffered.js";
import { ReadableStream } from "./stream.js";

function randomUint8Array(length: number) {
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
        array[i] = Math.floor(Math.random() * 256);
    }
    return array;
}

class MockReadableStream extends ReadableStream<Uint8Array> {
    constructor(buffers: Uint8Array[]) {
        let index = 0;
        super({
            pull(controller) {
                if (index === buffers.length) {
                    controller.close();
                    return;
                }
                controller.enqueue(buffers[index]!);
                index += 1;
            },
        });
    }
}

async function runTest(inputSizes: number[], readSizes: number[]) {
    const totalSize = inputSizes.reduce((a, b) => a + b, 0);
    const input = randomUint8Array(totalSize);
    const buffers: Uint8Array[] = [];
    let index = 0;
    for (const size of inputSizes) {
        buffers.push(input.subarray(index, index + size));
        index += size;
    }

    const stream = new MockReadableStream(buffers);
    const buffered = new BufferedReadableStream(stream);

    index = 0;
    for (const size of readSizes) {
        const buffer = await buffered.readExactly(size);
        expect(buffer).toEqual(input.subarray(index, index + size));
        index += size;
    }
}

describe("BufferedStream", () => {
    describe("read 1 time", () => {
        it("read 0 buffer", async () => {
            const source = new MockReadableStream([]);
            const buffered = new BufferedReadableStream(source);
            await expect(buffered.readExactly(10)).rejects.toThrow();
        });

        it("input 1 exact buffer", async () => {
            const input = randomUint8Array(10);
            const source = new MockReadableStream([input]);
            const buffered = new BufferedReadableStream(source);
            await expect(buffered.readExactly(10)).resolves.toBe(input);
        });

        it("input 1 large buffer", () => {
            return runTest([20], [10]);
        });

        it("read 1 small buffer", async () => {
            const source = new MockReadableStream([randomUint8Array(5)]);
            const buffered = new BufferedReadableStream(source);
            await expect(buffered.readExactly(10)).rejects.toThrow();
        });

        it("input 2 small buffers", () => {
            return runTest([5, 5], [10]);
        });

        it("read 2 small buffers", async () => {
            const source = new MockReadableStream([
                randomUint8Array(5),
                randomUint8Array(5),
            ]);
            const buffered = new BufferedReadableStream(source);
            await expect(buffered.readExactly(20)).rejects.toThrow();
        });

        it("input 2 small + large buffers", () => {
            return runTest([5, 10], [10]);
        });
    });

    describe("read 2 times", () => {
        it("input 1 exact buffer", () => {
            return runTest([10], [5, 5]);
        });

        it("input 1 large buffer", () => {
            return runTest([20], [5, 5]);
        });

        it("input 2 exact buffers", () => {
            return runTest([5, 5], [5, 5]);
        });

        it("input 2 exact + large buffers", () => {
            return runTest([5, 10], [5, 8]);
        });

        it("input 2 small + large buffers", () => {
            return runTest([5, 10], [7, 8]);
        });

        it("input 2 large buffers", () => {
            return runTest([10, 10], [8, 8]);
        });

        it("input 3 small buffers", () => {
            return runTest([3, 3, 3], [5, 4]);
        });

        it("input 3 small buffers 2", () => {
            return runTest([3, 3, 3], [7, 2]);
        });
    });
});
