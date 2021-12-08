import { Adb } from "@yume-chan/adb";
import { DEFAULT_SERVER_PATH } from "./options";

export interface PushServerOptions {
    path?: string;
    onProgress?: (progress: number) => void;
}

export async function pushServer(
    device: Adb,
    file: ArrayBuffer,
    options: PushServerOptions = {}
) {
    const {
        path = DEFAULT_SERVER_PATH,
        onProgress,
    } = options;

    const sync = await device.sync();
    return sync.write(
        path,
        file,
        undefined,
        undefined,
        onProgress
    );
}
