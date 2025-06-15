import * as assert from "node:assert";
import { describe, it } from "node:test";

import { Consumable } from "../consumable.js";
import { WritableStream } from "../stream.js";

import { MaybeConsumableWrapWritableStream } from "./wrap-writable.js";

describe("MaybeConsumable", () => {
    describe("WrapWritableStream", () => {
        it("should write to inner stream", async () => {
            let step = 0;

            const stream = new MaybeConsumableWrapWritableStream(
                new WritableStream({
                    write(chunk) {
                        switch (step) {
                            case 0:
                                assert.strictEqual(chunk, "a");
                                step += 1;
                                break;
                            case 2:
                                assert.strictEqual(chunk, "b");
                                step += 1;
                                break;
                        }
                    },
                }),
            );
            const writer = stream.getWriter();

            await writer.write("a");
            assert.strictEqual(step, 1);
            step += 1;

            await writer.write(new Consumable("b"));
            assert.strictEqual(step, 3);
            step += 1;

            await writer.close();
        });

        it("should pause the source stream while piping", async () => {
            let step = 0;

            const stream = new MaybeConsumableWrapWritableStream<string>(
                new WritableStream({
                    write(chunk) {
                        switch (step) {
                            case 0:
                                assert.strictEqual(chunk, "a");
                                step += 1;
                                break;
                            case 2:
                                assert.strictEqual(chunk, "b");
                                step += 1;
                                break;
                        }
                    },
                }),
            );

            const readable = new Consumable.ReadableStream<string>({
                async start(controller) {
                    await controller.enqueue("a");
                    assert.strictEqual(step, 1);
                    step += 1;

                    await controller.enqueue("b");
                    assert.strictEqual(step, 3);
                    step += 1;

                    controller.close();
                },
            });

            await readable.pipeTo(stream);
        });
    });
});
