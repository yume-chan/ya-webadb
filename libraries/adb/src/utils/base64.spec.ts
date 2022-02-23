import { calculateBase64EncodedLength, decodeBase64, encodeBase64 } from './base64';

describe('base64', () => {
    describe('calculateBase64EncodedLength', () => {
        it('input 0', () => {
            expect(calculateBase64EncodedLength(0)).toEqual([0, 0]);
        });

        it('input 1', () => {
            expect(calculateBase64EncodedLength(1)).toEqual([4, 2]);
        });

        it('input 2', () => {
            expect(calculateBase64EncodedLength(2)).toEqual([4, 1]);
        });

        it('input 3', () => {
            expect(calculateBase64EncodedLength(3)).toEqual([4, 0]);
        });

        it('input 4', () => {
            expect(calculateBase64EncodedLength(4)).toEqual([8, 2]);
        });

        it('input 5', () => {
            expect(calculateBase64EncodedLength(5)).toEqual([8, 1]);
        });

        it('input 6', () => {
            expect(calculateBase64EncodedLength(6)).toEqual([8, 0]);
        });
    });

    describe('decodeBase64', () => {
        it("input length 0", () => {
            expect(decodeBase64('')).toEqual(new Uint8Array());
        });

        it("input length 1", () => {
            expect(decodeBase64('AA==')).toEqual(new Uint8Array([0]));
        });

        it("input length 2", () => {
            expect(decodeBase64('AAE=')).toEqual(new Uint8Array([0, 1]));
        });

        it("input length 3", () => {
            /* cspell: disable-next-line */
            expect(decodeBase64('AAEC')).toEqual(new Uint8Array([0, 1, 2]));
        });

        it("input length 4", () => {
            /* cspell: disable-next-line */
            expect(decodeBase64('AAECAw==')).toEqual(new Uint8Array([0, 1, 2, 3]));
        });

        it("input length 5", () => {
            /* cspell: disable-next-line */
            expect(decodeBase64('AAECAwQ=')).toEqual(new Uint8Array([0, 1, 2, 3, 4]));
        });

        it("input length 6", () => {
            /* cspell: disable-next-line */
            expect(decodeBase64('AAECAwQF')).toEqual(new Uint8Array([0, 1, 2, 3, 4, 5]));
        });

        it("all byte values", () => {
            expect(
                decodeBase64(
                    'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w=='
                )
            ).toEqual(new Uint8Array(Array.from({ length: 256 }, (_, index) => index)));
        });
    });

    describe('encodeBase64', () => {
        it('input length 0', () => {
            expect(
                encodeBase64(
                    new Uint8Array()
                )
            ).toEqual(new Uint8Array());
        });

        it('input length 1', () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        [0]
                    )
                )
            ).toEqual(new Uint8Array([65, 65, 61, 61])); // AA==
        });

        it('input length 2', () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        [0, 1]
                    )
                )
            ).toEqual(new Uint8Array([65, 65, 69, 61])); // AAE=
        });

        it('input length 3', () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        [0, 1, 2]
                    )
                )
                /* cspell: disable-next-line */
            ).toEqual(new Uint8Array([65, 65, 69, 67])); // AAEC
        });

        it('input length 4', () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        [0, 1, 2, 3]
                    )
                )
                /* cspell: disable-next-line */
            ).toEqual(new Uint8Array([65, 65, 69, 67, 65, 119, 61, 61])); // AAECAw==
        });

        it('input length 5', () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        [0, 1, 2, 3, 4]
                    )
                )
                /* cspell: disable-next-line */
            ).toEqual(new Uint8Array([65, 65, 69, 67, 65, 119, 81, 61])); // AAECAwQ=
        });

        it('input length 6', () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        [0, 1, 2, 3, 4, 5]
                    )
                )
                /* cspell: disable-next-line */
            ).toEqual(new Uint8Array([65, 65, 69, 67, 65, 119, 81, 70])); // AAECAwQF
        });

        it("all byte values", () => {
            expect(
                encodeBase64(
                    new Uint8Array(
                        Array.from({ length: 256 }, (_, index) => index)
                    )
                )
            ).toEqual(new Uint8Array([65, 65, 69, 67, 65, 119, 81, 70, 66, 103, 99, 73, 67, 81, 111, 76, 68, 65, 48, 79, 68, 120, 65, 82, 69, 104, 77, 85, 70, 82, 89, 88, 71, 66, 107, 97, 71, 120, 119, 100, 72, 104, 56, 103, 73, 83, 73, 106, 74, 67, 85, 109, 74, 121, 103, 112, 75, 105, 115, 115, 76, 83, 52, 118, 77, 68, 69, 121, 77, 122, 81, 49, 78, 106, 99, 52, 79, 84, 111, 55, 80, 68, 48, 43, 80, 48, 66, 66, 81, 107, 78, 69, 82, 85, 90, 72, 83, 69, 108, 75, 83, 48, 120, 78, 84, 107, 57, 81, 85, 86, 74, 84, 86, 70, 86, 87, 86, 49, 104, 90, 87, 108, 116, 99, 88, 86, 53, 102, 89, 71, 70, 105, 89, 50, 82, 108, 90, 109, 100, 111, 97, 87, 112, 114, 98, 71, 49, 117, 98, 51, 66, 120, 99, 110, 78, 48, 100, 88, 90, 51, 101, 72, 108, 54, 101, 51, 120, 57, 102, 110, 43, 65, 103, 89, 75, 68, 104, 73, 87, 71, 104, 52, 105, 74, 105, 111, 117, 77, 106, 89, 54, 80, 107, 74, 71, 83, 107, 53, 83, 86, 108, 112, 101, 89, 109, 90, 113, 98, 110, 74, 50, 101, 110, 54, 67, 104, 111, 113, 79, 107, 112, 97, 97, 110, 113, 75, 109, 113, 113, 54, 121, 116, 114, 113, 43, 119, 115, 98, 75, 122, 116, 76, 87, 50, 116, 55, 105, 53, 117, 114, 117, 56, 118, 98, 54, 47, 119, 77, 72, 67, 119, 56, 84, 70, 120, 115, 102, 73, 121, 99, 114, 76, 122, 77, 51, 79, 122, 57, 68, 82, 48, 116, 80, 85, 49, 100, 98, 88, 50, 78, 110, 97, 50, 57, 122, 100, 51, 116, 47, 103, 52, 101, 76, 106, 53, 79, 88, 109, 53, 43, 106, 112, 54, 117, 118, 115, 55, 101, 55, 118, 56, 80, 72, 121, 56, 47, 84, 49, 57, 118, 102, 52, 43, 102, 114, 55, 47, 80, 51, 43, 47, 119, 61, 61]));
            // AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==
        });
    });
});
