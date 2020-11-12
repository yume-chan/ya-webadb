import { Adb } from "../adb";
import { escapeArg } from "./shell";

export async function install(
    adb: Adb,
    apk: ArrayLike<number> | ArrayBufferLike | AsyncIterable<ArrayBuffer>,
    onProgress?: (uploaded: number) => void,
) {
    const filename = `/data/local/tmp/${Math.random().toString().substr(2)}.apk`;

    const sync = await adb.sync();
    await sync.write(filename, apk, undefined, undefined, onProgress);
    sync.dispose();

    await adb.exec('pm', 'install', escapeArg(filename));
    await adb.rm(filename);
}
