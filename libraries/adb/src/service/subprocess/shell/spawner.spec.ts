import * as assert from "node:assert";
import { describe, it, mock } from "node:test";

import { PromiseResolver } from "@yume-chan/async";
import type { ReadableStreamDefaultController } from "@yume-chan/stream-extra";
import { ReadableStream, WritableStream } from "@yume-chan/stream-extra";

import type { AdbShellProtocolProcess } from "./spawner.js";
import { adbShellProtocolSpawner } from "./spawner.js";

describe("adbShellProtocolSpawner", () => {
    it("`wait` should await killing the process", async () => {
        const killStarted = new PromiseResolver<void>();
        const killFinished = new PromiseResolver<void>();
        const kill = mock.fn(async () => {
            killStarted.resolve();
            await killFinished.promise;
        });
        const process = {
            stdin: new WritableStream(),
            stdout: new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array([1, 2, 3]));
                    controller.close();
                },
            }),
            stderr: new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array([4, 5, 6]));
                    controller.close();
                },
            }),
            exited: Promise.resolve(42),
            kill,
        } satisfies AdbShellProtocolProcess;
        const spawn = adbShellProtocolSpawner(() => Promise.resolve(process));

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
        assert.deepStrictEqual(await waitPromise, {
            stdout: new Uint8Array([1, 2, 3]),
            stderr: new Uint8Array([4, 5, 6]),
            exitCode: 42,
        });
        assert.strictEqual(kill.mock.callCount(), 1);
    });

    it("`wait` should kill the process when piping stdin fails", async () => {
        const error = new Error("stdin failed");
        let stdoutController!: ReadableStreamDefaultController<Uint8Array>;
        let stderrController!: ReadableStreamDefaultController<Uint8Array>;
        const kill = mock.fn(() => {
            stdoutController.close();
            stderrController.close();
        });
        const process = {
            stdin: new WritableStream(),
            stdout: new ReadableStream({
                start(controller) {
                    stdoutController = controller;
                },
            }),
            stderr: new ReadableStream({
                start(controller) {
                    stderrController = controller;
                },
            }),
            exited: new Promise<number>(() => {}),
            kill,
        } satisfies AdbShellProtocolProcess;
        const spawn = adbShellProtocolSpawner(() => Promise.resolve(process));
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
