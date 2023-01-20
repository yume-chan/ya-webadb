import { describe, expect, it } from "@jest/globals";

import { ScrcpyControlMessageType } from "../../control/index.js";

import { ScrcpyScrollController1_16 } from "./scroll.js";

describe("ScrcpyScrollController1_16", () => {
    it("should return undefined when scroll distance is less than 1", () => {
        const controller = new ScrcpyScrollController1_16();
        const message = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
            scrollX: 0.5,
            scrollY: 0.5,
            buttons: 0,
        });
        expect(message).toBeUndefined();
    });

    it("should return a message when scroll distance is greater than 1", () => {
        const controller = new ScrcpyScrollController1_16();
        const message = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
            scrollX: 1.5,
            scrollY: 1.5,
            buttons: 0,
        });
        expect(message).toBeInstanceOf(Uint8Array);
        expect(message).toHaveProperty("byteLength", 21);
    });

    it("should return a message when accumulated scroll distance is greater than 1", () => {
        const controller = new ScrcpyScrollController1_16();
        controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
            scrollX: 0.5,
            scrollY: 0.5,
            buttons: 0,
        });
        const message = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
            scrollX: 0.5,
            scrollY: 0.5,
            buttons: 0,
        });
        expect(message).toBeInstanceOf(Uint8Array);
        expect(message).toHaveProperty("byteLength", 21);
    });

    it("should return a message when accumulated scroll distance is less than -1", () => {
        const controller = new ScrcpyScrollController1_16();
        controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
            scrollX: -0.5,
            scrollY: -0.5,
            buttons: 0,
        });
        const message = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            screenWidth: 0,
            screenHeight: 0,
            scrollX: -0.5,
            scrollY: -0.5,
            buttons: 0,
        });
        expect(message).toBeInstanceOf(Uint8Array);
        expect(message).toHaveProperty("byteLength", 21);
    });
});
