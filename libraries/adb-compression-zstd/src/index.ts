import { AdbSync } from "@yume-chan/adb";
import { TransformStream } from "@yume-chan/stream-extra";
import * as Comlink from "comlink";

import * as Core from "./core.js";

const isMainThread = typeof window !== "undefined";

type MaybeRemote<T> = T | Comlink.Remote<T>;

async function getCore<T>(
    core: T,
    worker: "auto" | boolean | undefined,
): Promise<{ worker: Worker | undefined; core: MaybeRemote<T> }> {
    switch (worker) {
        case "auto":
        case undefined:
            worker = isMainThread;
            break;
    }

    if (worker === true) {
        const worker = new Worker(new URL("./worker.js", import.meta.url), {
            type: "module",
        });
        const core = await new Promise<Comlink.Remote<T>>((resolve, reject) => {
            const abortController = new AbortController();
            worker.addEventListener(
                "message",
                (e) => {
                    if (e.data === "ready") {
                        abortController.abort();
                        resolve(Comlink.wrap<T>(worker));
                    }
                },
                { signal: abortController.signal },
            );
            worker.addEventListener(
                "error",
                (e) => {
                    abortController.abort();
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    reject(e.error);
                },
                { signal: abortController.signal },
            );
        });
        return { worker, core };
    } else {
        return { worker: undefined, core };
    }
}

export function registerZstdCompression(
    options: {
        worker?: "auto" | boolean | undefined;
    } = {},
) {
    AdbSync.Compression.registerCompressionAdapter(
        AdbSync.Compression.Format.Zstd,
        () => {
            let worker: Worker | undefined;
            let rawStream!: MaybeRemote<Core.CompressStream>;
            return new TransformStream({
                async start() {
                    const result = await getCore(Core, options.worker);
                    worker = result.worker;
                    rawStream = await result.core.createCompressStream();
                },
                async transform(chunk, controller) {
                    const output = await rawStream.push(chunk);
                    if (output.length) {
                        controller.enqueue(output);
                    }
                },
                async flush(controller) {
                    const output = await rawStream.finish();
                    controller.enqueue(output);
                    worker?.terminate();
                },
                cancel() {
                    worker?.terminate();
                },
            });
        },
    );

    AdbSync.Compression.registerDecompressionAdapter(
        AdbSync.Compression.Format.Zstd,
        () => {
            let worker: Worker | undefined;
            let rawStream!: MaybeRemote<Core.DecompressStream>;
            return new TransformStream({
                async start() {
                    const result = await getCore(Core, options.worker);
                    worker = result.worker;
                    rawStream = await result.core.createDecompressStream();
                },
                async transform(chunk, controller) {
                    const output = await rawStream.push(chunk);
                    if (output.length) {
                        controller.enqueue(output);
                    }
                },
                async flush(controller) {
                    const output = await rawStream.finish();
                    if (output.length) {
                        controller.enqueue(output);
                    }
                    worker?.terminate();
                },
                cancel() {
                    worker?.terminate();
                },
            });
        },
    );
}
