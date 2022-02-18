import { Adb, AdbSync, WritableStream, WritableStreamDefaultWriter } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options";

export interface PushServerOptions {
    path?: string;
}

export async function pushServerStream(
    device: Adb,
    options: PushServerOptions = {}
) {
    const { path = DEFAULT_SERVER_PATH } = options;

    let sync!: AdbSync;
    let writable!: WritableStream<ArrayBuffer>;
    let writer!: WritableStreamDefaultWriter<ArrayBuffer>;
    return new WritableStream<ArrayBuffer>({
        async start() {
            sync = await device.sync();
            writable = sync.write(path);
            writer = writable.getWriter();
        },
        async write(chunk: ArrayBuffer) {
            await writer.ready;
            await writer.write(chunk);
        },
        async abort(e) {
            await writer.abort(e);
            sync.dispose();
        },
        async close() {
            await writer.close();
            await sync.dispose();
        },
    });
}
