import { WrapWritableStream, type Adb, type AdbSync } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options/index.js";

export interface PushServerOptions {
    path?: string;
}

export function pushServer(
    device: Adb,
    options: PushServerOptions = {}
) {
    const { path = DEFAULT_SERVER_PATH } = options;

    let sync!: AdbSync;
    return new WrapWritableStream<Uint8Array>({
        async start() {
            sync = await device.sync();
            return sync.write(path);
        },
        async close() {
            await sync.dispose();
        },
    });
}
