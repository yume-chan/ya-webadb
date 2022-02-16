import { Adb } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options";

export interface PushServerOptions {
    path?: string;
}

export async function pushServer(
    device: Adb,
    file: ReadableStream<ArrayBuffer>,
    options: PushServerOptions = {}
) {
    const {
        path = DEFAULT_SERVER_PATH,
    } = options;

    const sync = await device.sync();
    const stream = sync.write(path);
    await file.pipeTo(stream);
}
