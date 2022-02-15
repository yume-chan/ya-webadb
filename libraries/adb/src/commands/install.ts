import { Adb } from "../adb";
import { ReadableStream } from "../utils";
import { escapeArg } from "./shell";

export async function install(
    adb: Adb,
    apk: ReadableStream<ArrayBuffer>,
    onProgress?: (uploaded: number) => void,
): Promise<void> {
    const filename = `/data/local/tmp/${Math.random().toString().substring(2)}.apk`;

    // Upload apk file to tmp folder
    const sync = await adb.sync();
    const writable = sync.write(filename, undefined, undefined, onProgress);
    await apk.pipeTo(writable);
    sync.dispose();

    // Invoke `pm install` to install it
    await adb.childProcess.spawnAndWaitLegacy(['pm', 'install', escapeArg(filename)]);

    // Remove the temp file
    await adb.rm(filename);
}
