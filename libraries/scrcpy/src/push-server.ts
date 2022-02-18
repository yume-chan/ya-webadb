import { Adb, AdbSync, HookWritableStream, WritableStream } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options";

export interface PushServerOptions {
    path?: string;
}

export function pushServer(
    device: Adb,
    options: PushServerOptions = {}
) {
    const { path = DEFAULT_SERVER_PATH } = options;

    return new HookWritableStream<ArrayBuffer, WritableStream<ArrayBuffer>, AdbSync>({
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
