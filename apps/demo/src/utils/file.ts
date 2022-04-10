import getConfig from "next/config";
import type { WritableStream } from '@yume-chan/adb';

interface PickFileOptions {
    accept?: string;
}

export function pickFile(options: { multiple: true; } & PickFileOptions): Promise<FileList>;
export function pickFile(options: { multiple?: false; } & PickFileOptions): Promise<File | null>;
export function pickFile(options: { multiple?: boolean; } & PickFileOptions): Promise<FileList | File | null> {
    return new Promise<FileList | File | null>(resolve => {
        const input = document.createElement('input');
        input.type = 'file';

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

let StreamSaver: typeof import('streamsaver');
if (typeof window !== 'undefined') {
    const { publicRuntimeConfig } = getConfig();
    // Can't use `import` here because ESM is read-only (can't set `mitm` field)
    // Add `await` here because top-level await is on, so every import can be a `Promise`
    StreamSaver = await require('streamsaver');
    StreamSaver.mitm = publicRuntimeConfig.basePath + '/StreamSaver/mitm.html';
}

export function saveFile(fileName: string, size?: number | undefined) {
    return StreamSaver!.createWriteStream(
        fileName,
        { size }
    ) as unknown as WritableStream<Uint8Array>;
}
