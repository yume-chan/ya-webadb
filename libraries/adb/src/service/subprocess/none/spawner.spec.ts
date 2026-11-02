import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import { PromiseResolver } from "@yume-chan/async";
import type { ReadableStreamDefaultController } from "@yume-chan/stream-extra";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { AdbNoneProtocolProcess } from "./spawner.js";
import { adbNoneProtocolSpawner } from "./spawner.js";

describe("adbNoneProtocolSpawner", () => {
    it("`wait` should await killing the process", async () => {
        const killStarted = new PromiseResolver<void>();
        const killFinished = new PromiseResolver<void>();
        const kill = mock.fn(async () => {
            killStarted.resolve();
            await killFinished.promise;
        });
        const process = {
            stdin: new WritableStream(),
            output: new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array([1, 2, 3]));
                    controller.close();
                },
            }),
            exited: Promise.resolve(),
            kill,
        } satisfies AdbNoneProtocolProcess;
        const spawn = adbNoneProtocolSpawner(() => Promise.resolve(process));

        const waitPromise = (async () => await spawn(["echo"]).wait())();
        let waitSettled = false;
        void waitPromise.then(
            () => {
                waitSettled = true;
            },
            () => {
                waitSettled = true;
            },
        );

        await killStarted.promise;
        assert.strictEqual(waitSettled, false);

        killFinished.resolve();
        assert.deepStrictEqual(await waitPromise, new Uint8Array([1, 2, 3]));
        assert.strictEqual(kill.mock.callCount(), 1);
    });

    it("`wait` should kill the process when piping stdin fails", async () => {
        const error = new Error("stdin failed");
        let outputController!: ReadableStreamDefaultController<Uint8Array>;
        const kill = mock.fn(() => {
            outputController.close();
        });
        const process = {
            stdin: new WritableStream(),
            output: new ReadableStream({
                start(controller) {
                    outputController = controller;
                },
            }),
            exited: new Promise<void>(() => {}),
            kill,
        } satisfies AdbNoneProtocolProcess;
        const spawn = adbNoneProtocolSpawner(() => Promise.resolve(process));
        const stdin = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.error(error);
            },
        });

        await assert.rejects(
            async () => await spawn(["cat"]).wait({ stdin }),
            error,
        );

        assert.strictEqual(kill.mock.callCount(), 1);
    });
});
