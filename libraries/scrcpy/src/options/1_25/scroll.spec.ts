import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyControlMessageType } from "../../control/index.js";

import { ScrcpyScrollController1_25, ScrcpySignedFloat } from "./scroll.js";

describe("ScrcpySignedFloat", () => {
    it("should serialize", () => {
        const array = new Uint8Array(2);
        ScrcpySignedFloat.serialize(-1, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(
            new DataView(array.buffer).getInt16(0, true),
            -0x8000,
        );

        ScrcpySignedFloat.serialize(0, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(new DataView(array.buffer).getInt16(0, true), 0);

        ScrcpySignedFloat.serialize(1, {
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
        ScrcpySignedFloat.serialize(-2, {
            buffer: array,
            index: 0,
            littleEndian: true,
        });
        assert.strictEqual(
            new DataView(array.buffer).getInt16(0, true),
            -0x8000,
        );

        ScrcpySignedFloat.serialize(2, {
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
            ScrcpySignedFloat.deserialize({
                runtimeStruct: {} as never,
                reader: { position: 0, readExactly: () => view },
                littleEndian: true,
            }),
            -1,
        );

        dataView.setInt16(0, 0, true);
        assert.strictEqual(
            ScrcpySignedFloat.deserialize({
                runtimeStruct: {} as never,
                reader: { position: 0, readExactly: () => view },
                littleEndian: true,
            }),
            0,
        );

        dataView.setInt16(0, 0x7fff, true);
        assert.strictEqual(
            ScrcpySignedFloat.deserialize({
                runtimeStruct: {} as never,
                reader: { position: 0, readExactly: () => view },
                littleEndian: true,
            }),
            1,
        );
    });
});

describe("ScrcpyScrollController1_25", () => {
    it("should return a message for each scroll event", () => {
        const controller = new ScrcpyScrollController1_25();
        const message1 = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
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
            screenWidth: 0,
            screenHeight: 0,
            scrollX: 1.5,
            scrollY: 1.5,
            buttons: 0,
        });
        assert.ok(message2 instanceof Uint8Array);
        assert.strictEqual(message2.byteLength, 21);
    });
});
