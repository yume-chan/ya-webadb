import { Adb } from "../adb";
import { escapeArg } from "./shell";

export async function install(
    adb: Adb,
    apk: ArrayLike<number> | ArrayBufferLike | AsyncIterable<ArrayBuffer>,
    onProgress?: (uploaded: number) => void,
): Promise<void> {
    const filename = `/data/local/tmp/${Math.random().toString().substr(2)}.apk`;

    // Upload apk file to tmp folder
    const sync = await adb.sync();
    await sync.write(filename, apk, undefined, undefined, onProgress);
    sync.dispose();

    // Invoke `pm install` to install it
    await adb.exec('pm', 'install', escapeArg(filename));

    // Remove the temp file
    await adb.rm(filename);
}
