import assert from "node:assert";
import { describe, it } from "node:test";

import { Event } from "./event.js";

describe("global", () => {
    describe("Event", () => {
        it("should exist", () => {
            assert(!!Event, "Event should be defined");
        });
    });
});
