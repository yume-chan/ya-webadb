import * as assert from "node:assert";
import { describe, it } from "node:test";

import { Uint8ArrayExactReadable } from "@yume-chan/struct";

import { ScrcpyControlMessageType } from "../../base/index.js";

import { ScrollController, SignedFloat } from "./scroll-controller.js";

describe("SignedFloat", () => {
    it("should serialize", () => {
        const array = new Uint8Array(2);
        SignedFloat.serialize(-1, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(
            new DataView(array.buffer).getInt16(0, true),
            -0x8000,
        );

        SignedFloat.serialize(0, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(new DataView(array.buffer).getInt16(0, true), 0);

        SignedFloat.serialize(1, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(
            new DataView(array.buffer).getInt16(0, true),
            0x7fff,
        );
    });

    it("should clamp input values", () => {
        const array = new Uint8Array(2);
        SignedFloat.serialize(-2, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(
            new DataView(array.buffer).getInt16(0, true),
            -0x8000,
        );

        SignedFloat.serialize(2, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(
            new DataView(array.buffer).getInt16(0, true),
            0x7fff,
        );
    });

    it("should deserialize", () => {
        const dataView = new DataView(new ArrayBuffer(2));
        const view = new Uint8Array(dataView.buffer);

        dataView.setInt16(0, -0x8000, true);
        assert.strictEqual(
            SignedFloat.deserialize(new Uint8ArrayExactReadable(view), {
                littleEndian: true,
                dependencies: {} as never,
            }),
            -1,
        );

        dataView.setInt16(0, 0, true);
        assert.strictEqual(
            SignedFloat.deserialize(new Uint8ArrayExactReadable(view), {
                littleEndian: true,
                dependencies: {} as never,
            }),
            0,
        );

        dataView.setInt16(0, 0x7fff, true);
        assert.strictEqual(
            SignedFloat.deserialize(new Uint8ArrayExactReadable(view), {
                littleEndian: true,
                dependencies: {} as never,
            }),
            1,
        );
    });
});

describe("ScrollController", () => {
    it("should return a message for each scroll event", () => {
        const controller = new ScrollController();
        const message1 = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            videoWidth: 0,
            videoHeight: 0,
            scrollX: 0.5,
            scrollY: 0.5,
            buttons: 0,
        });
        assert.ok(message1 instanceof Uint8Array);
        assert.strictEqual(message1.byteLength, 21);

        const message2 = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            videoWidth: 0,
            videoHeight: 0,
            scrollX: 1.5,
            scrollY: 1.5,
            buttons: 0,
        });
        assert.ok(message2 instanceof Uint8Array);
        assert.strictEqual(message2.byteLength, 21);
    });
});
