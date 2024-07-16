import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import type { Disposable } from "./disposable.js";
import { AutoDisposable } from "./disposable.js";

describe("Event", () => {
    describe("AutoDisposable", () => {
        it("should dispose its dependencies", () => {
            const myDisposable = {
                dispose: mock.fn(),
            };
            class MyAutoDisposable extends AutoDisposable {
                constructor(disposable: Disposable) {
                    super();
                    this.addDisposable(disposable);
                }
            }

            const myAutoDisposable = new MyAutoDisposable(myDisposable);
            myAutoDisposable.dispose();
            assert.strictEqual(myDisposable.dispose.mock.callCount(), 1);
        });
    });
});
