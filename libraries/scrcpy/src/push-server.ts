import { Adb, TransformStream } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options";

export interface PushServerOptions {
    path?: string;
}

export async function pushServerStream(
    device: Adb,
    options: PushServerOptions = {}
) {
    const {
        path = DEFAULT_SERVER_PATH,
    } = options;

    const sync = await device.sync();
    const writable = sync.write(path);

    const lockStream = new TransformStream<ArrayBuffer, ArrayBuffer>();
    // Same as inside AdbSync,
    // can only use `pipeTo` to detect the writable is fully closed.
    lockStream.readable
        .pipeTo(writable)
        .then(() => {
            sync.dispose();
        });

    return lockStream.writable;
}
