import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyControlMessageType } from "../../control/index.js";

import { ScrcpyScrollController1_22 } from "./scroll.js";

describe("ScrcpyScrollController1_22", () => {
    it("should return correct message length", () => {
        const controller = new ScrcpyScrollController1_22();
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
        assert.ok(message instanceof Uint8Array);
        assert.strictEqual(message.byteLength, 25);
    });
});
