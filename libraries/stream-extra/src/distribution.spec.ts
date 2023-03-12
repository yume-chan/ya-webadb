import { describe, expect, it, jest } from "@jest/globals";

import {
    ConsumableReadableStream,
    ConsumableWritableStream,
} from "./consumable.js";
import { DistributionStream } from "./distribution.js";

const TestData = new Uint8Array(50);
for (let i = 0; i < 50; i += 1) {
    TestData[i] = i;
}

async function testInputOutput(
    combine: boolean,
    inputLengths: number[],
    outputLengths: number[]
) {
    const write = jest.fn((chunk: Uint8Array) => {
        void chunk;
    });
    await new ConsumableReadableStream<Uint8Array>({
        async start(controller) {
            let offset = 0;
            for (const length of inputLengths) {
                const end = offset + length;
                await controller.enqueue(TestData.subarray(offset, end));
                offset = end;
            }
            controller.close();
        },
    })
        .pipeThrough(new DistributionStream(10, combine || undefined))
        .pipeTo(
            new ConsumableWritableStream({
                write(chunk) {
                    // chunk will be reused, so we need to copy it
                    write(chunk.slice());
                },
            })
        );

    expect(write).toHaveBeenCalledTimes(outputLengths.length);
    let offset = 0;
    for (let i = 0; i < outputLengths.length; i += 1) {
        const end = offset + outputLengths[i]!;
        expect(write).toHaveBeenNthCalledWith(
            i + 1,
            TestData.subarray(offset, end)
        );
        offset = end;
    }
}

describe("DistributionStream", () => {
    describe("combine: false", () => {
        it("should split chunks", async () => {
            await testInputOutput(false, [20], [10, 10]);
        });

        it("should split chunks with remainder", async () => {
            await testInputOutput(false, [21], [10, 10, 1]);
        });
    });

    describe("combine: true", () => {
        it("should combine two chunks", async () => {
            await testInputOutput(true, [5, 3], [8]);
            await testInputOutput(true, [5, 5], [10]);
        });

        it("should combine three chunks", async () => {
            await testInputOutput(true, [5, 3, 2], [10]);
        });

        it("should split and combine chunks", async () => {
            await testInputOutput(true, [5, 15], [10, 10]);
        });

        it("should return remainder", async () => {
            await testInputOutput(true, [5, 10], [10, 5]);
        });

        it("should split large chunks", async () => {
            await testInputOutput(true, [5, 20, 5], [10, 10, 10]);
        });
    });
});
