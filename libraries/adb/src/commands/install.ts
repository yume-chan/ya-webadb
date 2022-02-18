import { Adb } from "../adb";
import { HookWritableStream, WritableStream } from "../utils";
import { escapeArg } from "./subprocess";
import { AdbSync } from "./sync";

export function install(
    adb: Adb,
): WritableStream<ArrayBuffer> {
    const filename = `/data/local/tmp/${Math.random().toString().substring(2)}.apk`;

    return new HookWritableStream<ArrayBuffer, WritableStream<ArrayBuffer>, AdbSync>({
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
