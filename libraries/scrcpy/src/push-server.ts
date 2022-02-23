import { Adb, AdbSync, WrapWritableStream, WritableStream } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options";

export interface PushServerOptions {
    path?: string;
}

export function pushServer(
    device: Adb,
    options: PushServerOptions = {}
) {
    const { path = DEFAULT_SERVER_PATH } = options;

    return new WrapWritableStream<Uint8Array, WritableStream<Uint8Array>, AdbSync>({
        async start() {
            const sync = await device.sync();
            return {
                writable: sync.write(path),
                state: sync,
            };
        },
        async close(sync) {
            await sync.dispose();
        },
    });
}
