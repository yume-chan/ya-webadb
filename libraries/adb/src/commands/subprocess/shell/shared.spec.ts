import assert from "node:assert";
import { describe, it } from "node:test";

import { AdbShellProtocolId, AdbShellProtocolPacket } from "./shared.js";

describe("AdbShellProtocolPacket", () => {
    it("should serialize", () => {
        assert.deepStrictEqual(
            AdbShellProtocolPacket.serialize({
                id: AdbShellProtocolId.Stdout,
                data: new Uint8Array([1, 2, 3, 4]),
            }),
            new Uint8Array([1, 4, 0, 0, 0, 1, 2, 3, 4]),
        );
    });
});
