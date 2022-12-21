import { describe, it } from "@jest/globals";

import { DuplexStreamFactory } from "./duplex.js";
import { ReadableStream } from "./stream.js";

describe("DuplexStreamFactory", () => {
    it("should close all readable", async () => {
        const factory = new DuplexStreamFactory();
        const readable = factory.wrapReadable(new ReadableStream());
        const reader = readable.getReader();
        await factory.close();
        await reader.closed;
    });
});
