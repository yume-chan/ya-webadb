import * as assert from "node:assert";
import { describe, it } from "node:test";

import {
    calculateBase64EncodedLength,
    decodeBase64,
    encodeBase64,
} from "./base64.js";

describe("base64", () => {
    describe("calculateBase64EncodedLength", () => {
        it("should return correct length and padding", () => {
            assert.deepStrictEqual(calculateBase64EncodedLength(0), [0, 0]);
            assert.deepStrictEqual(calculateBase64EncodedLength(1), [4, 2]);
            assert.deepStrictEqual(calculateBase64EncodedLength(2), [4, 1]);
            assert.deepStrictEqual(calculateBase64EncodedLength(3), [4, 0]);
            assert.deepStrictEqual(calculateBase64EncodedLength(4), [8, 2]);
            assert.deepStrictEqual(calculateBase64EncodedLength(5), [8, 1]);
            assert.deepStrictEqual(calculateBase64EncodedLength(6), [8, 0]);
        });
    });

    const inputs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 254, 255, 256].map(
        (x) =>
            new Uint8Array(Array.from({ length: x }, (_, index) => x - index)),
    );

    describe("decodeBase64", () => {
        function nodeEncodeBase64(input: Uint8Array) {
            return Buffer.from(input).toString("base64");
        }

        inputs.forEach((input) => {
            describe(`input length = ${input.length}`, () => {
                it("should return correct decoded buffer", () => {
                    assert.deepStrictEqual(
                        decodeBase64(nodeEncodeBase64(input)),
                        input,
                    );
                });
            });
        });
    });

    describe("encodeBase64", () => {
        function nodeEncodeBase64(input: Uint8Array) {
            // Convert Buffer to Uint8Array
            return new Uint8Array(
                // Convert base64 string to Buffer
                Buffer.from(
                    // Convert `input` to base64 string
                    Buffer.from(input).toString("base64"),
                ),
            );
        }

        function createFilledBuffer(length: number, value: number) {
            const buffer = new Uint8Array(length);
            buffer.fill(value);
            return buffer;
        }

        function concatBuffers(...buffers: Uint8Array[]) {
            const length = buffers.reduce(
                (sum, buffer) => sum + buffer.length,
                0,
            );
            const result = new Uint8Array(length);
            let offset = 0;
            for (const buffer of buffers) {
                result.set(buffer, offset);
                offset += buffer.length;
            }
            return result;
        }

        inputs.forEach((input) => {
            const correct = nodeEncodeBase64(input);

            describe(`input length = ${input.length}`, () => {
                it("should return correct encoded buffer", () => {
                    assert.deepStrictEqual(encodeBase64(input), correct);
                });

                it("should take `output`", () => {
                    const output = createFilledBuffer(correct.length + 4, 0xcc);

                    const expectedOutput = output.slice();
                    expectedOutput.set(correct, 2);

                    const outputLength = encodeBase64(
                        input,
                        output.subarray(2, 2 + correct.length + 2),
                    );
                    assert.strictEqual(outputLength, correct.length);
                    assert.deepStrictEqual(output, expectedOutput);
                });

                it("should throw if `output` is too small", () => {
                    if (correct.length !== 0) {
                        const output = new Uint8Array(correct.length - 1);
                        assert.throws(() => {
                            encodeBase64(input, output);
                        });
                    }
                });

                describe("in-place encoding", () => {
                    function canEncodeInPlaceForward(
                        inputOffset: number,
                        outputOffset: number,
                    ) {
                        let inputIndex = inputOffset;
                        let outputIndex = outputOffset;

                        while (inputIndex < inputOffset + input.length) {
                            // Some input being overwritten before being read
                            if (outputIndex > inputIndex) {
                                return false;
                            }

                            if (inputOffset + input.length - inputIndex <= 3) {
                                return true;
                            }

                            inputIndex += 3;
                            outputIndex += 4;
                        }

                        return true;
                    }

                    function canEncodeInPlaceBackward(
                        inputOffset: number,
                        outputOffset: number,
                    ) {
                        let inputIndex = inputOffset + input.length - 1;
                        let outputIndex = outputOffset + correct.length - 1;

                        const paddingLength = correct.filter(
                            (x) => x === "=".charCodeAt(0),
                        ).length;
                        if (paddingLength !== 0) {
                            inputIndex -= 3 - paddingLength;
                            outputIndex -= 4;
                        }

                        while (inputIndex >= inputOffset) {
                            // Some input being overwritten before being read
                            if (outputIndex < inputIndex) {
                                return false;
                            }

                            inputIndex -= 3;
                            outputIndex -= 4;
                        }

                        return true;
                    }

                    function canEncodeInPlace(
                        inputOffset: number,
                        outputOffset: number,
                    ) {
                        return (
                            canEncodeInPlaceForward(
                                inputOffset,
                                outputOffset,
                            ) ||
                            canEncodeInPlaceBackward(inputOffset, outputOffset)
                        );
                    }

                    function testInPlaceEncodeBase64(outputOffset: number) {
                        const buffer = concatBuffers(
                            createFilledBuffer(correct.length + 2, 0xcc),
                            input,
                            createFilledBuffer(correct.length + 2, 0xcc),
                        );

                        const expectedBuffer = buffer.slice();
                        expectedBuffer.set(correct, outputOffset);

                        const outputLength = encodeBase64(
                            buffer.subarray(
                                correct.length + 2,
                                correct.length + 2 + input.length,
                            ),
                            buffer.subarray(outputOffset),
                        );
                        assert.strictEqual(outputLength, correct.length);
                        assert.deepStrictEqual(buffer, expectedBuffer);
                    }

                    // Validate with the dumb version of `canEncodeInPlace` above.
                    // But only test border cases.
                    let prev = true;
                    let last = 0;
                    for (let i = 2; i < correct.length + input.length; i += 1) {
                        if (canEncodeInPlace(correct.length + 2, i)) {
                            if (prev) {
                                continue;
                            }
                            prev = true;

                            if (i - 1 !== last) {
                                it(`should throw with offset = ${
                                    i - 1
                                }`, () => {
                                    assert.throws(() => {
                                        testInPlaceEncodeBase64(i - 1);
                                    });
                                });
                            }

                            last = i;
                            it(`should encode in place with offset = ${i}`, () => {
                                testInPlaceEncodeBase64(i);
                            });
                        } else {
                            if (!prev) {
                                continue;
                            }
                            prev = false;

                            if (i - 1 !== last) {
                                it(`should encode in place with offset = ${
                                    i - 1
                                }`, () => {
                                    testInPlaceEncodeBase64(i - 1);
                                });
                            }

                            last = i;

                            it(`should throw with offset = ${i}`, () => {
                                assert.throws(() => {
                                    testInPlaceEncodeBase64(i);
                                });
                            });
                        }
                    }
                });
            });
        });
    });
});
