import { describe, expect, it } from "@jest/globals";

import Struct from "./index.js";

describe("Struct", () => {
    describe("Index", () => {
        it("should export default Struct", () => {
            expect(Struct).toBeDefined();
        });
    });
});
