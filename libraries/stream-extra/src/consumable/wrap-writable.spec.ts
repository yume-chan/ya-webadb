import * as assert from "node:assert";
import { describe, it } from "node:test";

describe("Consumable", () => {
    describe("WritableStream", () => {
        it("should not pause the source stream while piping", async () => {
            let step = 0;

            const stream = new WritableStream<string>({
                write(chunk) {
                    switch (step) {
                        case 2:
                            assert.strictEqual(chunk, "a");
                            step += 1;
                            break;
                        case 3:
                            assert.strictEqual(chunk, "b");
                            step += 1;
                            break;
                    }
                },
            });

            const readable = new ReadableStream<string>({
                start(controller) {
                    controller.enqueue("a");
                    assert.strictEqual(step, 0);
                    step += 1;

                    controller.enqueue("b");
                    assert.strictEqual(step, 1);
                    step += 1;

                    controller.close();
                },
            });

            await readable.pipeTo(stream);
        });
    });
});
