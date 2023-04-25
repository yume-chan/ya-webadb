import {
    WrapReadableStream,
    WritableStream,
    type ReadableStream,
} from "@yume-chan/stream-extra";
import getConfig from "next/config";

interface PickFileOptions {
    accept?: string;
}

export function pickFile(
    options: { multiple: true } & PickFileOptions
): Promise<FileList>;
export function pickFile(
    options: { multiple?: false } & PickFileOptions
): Promise<File | null>;
export function pickFile(
    options: { multiple?: boolean } & PickFileOptions
): Promise<FileList | File | null> {
    return new Promise<FileList | File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";

        if (options.multiple) {
            input.multiple = true;
        }

        if (options.accept) {
            input.accept = options.accept;
        }

        input.onchange = () => {
            if (options.multiple) {
                resolve(input.files!);
            } else {
                resolve(input.files!.item(0));
            }
        };

        input.click();
    });
}

let StreamSaver: typeof import("@yume-chan/stream-saver");
if (typeof window !== "undefined") {
    const {
        publicRuntimeConfig: { basePath },
    } = getConfig();
    // Can't use `import` here because ESM is read-only (can't set `mitm` field)
    StreamSaver = require("@yume-chan/stream-saver");
    StreamSaver.mitm = basePath + "/StreamSaver/mitm.html";
    // Pre-register the service worker for offline usage.
    // Request for service worker script won't go through another service worker
    // so can't be cached.
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register(basePath + "/StreamSaver/sw.js", {
            scope: basePath + "/StreamSaver/",
        });
    }
}

export function saveFile(fileName: string, size?: number | undefined) {
    return StreamSaver!.createWriteStream(fileName, {
        size,
    }) as unknown as WritableStream<Uint8Array>;
}

export function createFileStream(file: File) {
    // `@types/node` typing messed things up
    // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/58079
    // TODO: demo: remove the wrapper after switching to native stream implementation.
    return new WrapReadableStream<Uint8Array>(
        file.stream() as unknown as ReadableStream<Uint8Array>
    );
}
