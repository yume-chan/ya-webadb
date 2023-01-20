import { describe, expect, it } from "@jest/globals";

import { ScrcpyControlMessageType } from "../../control/index.js";

import {
    ScrcpyFloatToInt16NumberType,
    ScrcpyScrollController1_25,
} from "./scroll.js";

describe("ScrcpyFloatToInt16NumberType", () => {
    it("should serialize", () => {
        const dataView = new DataView(new ArrayBuffer(2));
        ScrcpyFloatToInt16NumberType.serialize(dataView, 0, -1, true);
        expect(dataView.getInt16(0, true)).toBe(-0x8000);

        ScrcpyFloatToInt16NumberType.serialize(dataView, 0, 0, true);
        expect(dataView.getInt16(0, true)).toBe(0);

        ScrcpyFloatToInt16NumberType.serialize(dataView, 0, 1, true);
        expect(dataView.getInt16(0, true)).toBe(0x7fff);
    });

    it("should clamp input values", () => {
        const dataView = new DataView(new ArrayBuffer(2));
        ScrcpyFloatToInt16NumberType.serialize(dataView, 0, -2, true);
        expect(dataView.getInt16(0, true)).toBe(-0x8000);

        ScrcpyFloatToInt16NumberType.serialize(dataView, 0, 2, true);
        expect(dataView.getInt16(0, true)).toBe(0x7fff);
    });

    it("should deserialize", () => {
        const dataView = new DataView(new ArrayBuffer(2));
        const view = new Uint8Array(dataView.buffer);

        dataView.setInt16(0, -0x8000, true);
        expect(ScrcpyFloatToInt16NumberType.deserialize(view, true)).toBe(-1);

        dataView.setInt16(0, 0, true);
        expect(ScrcpyFloatToInt16NumberType.deserialize(view, true)).toBe(0);

        dataView.setInt16(0, 0x7fff, true);
        expect(ScrcpyFloatToInt16NumberType.deserialize(view, true)).toBe(1);
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
        expect(message1).toBeInstanceOf(Uint8Array);
        expect(message1).toHaveProperty("byteLength", 21);

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
        expect(message2).toBeInstanceOf(Uint8Array);
        expect(message2).toHaveProperty("byteLength", 21);
    });
});
