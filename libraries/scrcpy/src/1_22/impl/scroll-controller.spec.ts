import * as assert from "node:assert";
import { describe, it } from "node:test";

import { ScrcpyControlMessageType } from "../../base/index.js";

import { ScrollController } from "./scroll-controller.js";

describe("ScrollController", () => {
    it("should return correct message length", () => {
        const controller = new ScrollController();
        const message = controller.serializeScrollMessage({
            type: ScrcpyControlMessageType.InjectScroll,
            pointerX: 0,
            pointerY: 0,
            videoWidth: 0,
            videoHeight: 0,
            scrollX: 1.5,
            scrollY: 1.5,
            buttons: 0,
        });
        assert.ok(message instanceof Uint8Array);
        assert.strictEqual(message.byteLength, 25);
    });
});
