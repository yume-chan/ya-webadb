import type { Adb } from "../adb.js";
import { WrapWritableStream, WritableStream } from "../stream/index.js";
import { escapeArg } from "./subprocess/index.js";
import type { AdbSync } from "./sync/index.js";

export function install(
    adb: Adb,
): WritableStream<Uint8Array> {
    const filename = `/data/local/tmp/${Math.random().toString().substring(2)}.apk`;

    return new WrapWritableStream<Uint8Array, WritableStream<Uint8Array>, AdbSync>({
        async start() {
            // Upload apk file to tmp folder
            const sync = await adb.sync();
            const writable = sync.write(filename, undefined, undefined);

            return {
                writable,
                state: sync,
            };
        },
        async close(sync) {
            sync.dispose();

            // Invoke `pm install` to install it
            await adb.subprocess.spawnAndWaitLegacy(['pm', 'install', escapeArg(filename)]);

            // Remove the temp file
            await adb.rm(filename);
        }
    });
}
