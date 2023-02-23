import { describe, expect, it } from "@jest/globals";

import { Uint8ArrayBufferFieldSubType } from "./base.js";
import { FixedLengthBufferLikeFieldDefinition } from "./fixed-length.js";

describe("Types", () => {
    describe("FixedLengthArrayBufferLikeFieldDefinition", () => {
        describe("#getSize", () => {
            it("should return size in its options", () => {
                const definition = new FixedLengthBufferLikeFieldDefinition(
                    Uint8ArrayBufferFieldSubType.Instance,
                    { length: 10 }
                );
                expect(definition.getSize()).toBe(10);
            });
        });
    });
});
