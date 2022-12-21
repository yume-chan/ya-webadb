import {
    WrapWritableStream,
    type WritableStream,
} from "@yume-chan/stream-extra";

import { type Adb } from "../adb.js";

import { escapeArg } from "./subprocess/index.js";
import { type AdbSync } from "./sync/index.js";

export function install(adb: Adb): WritableStream<Uint8Array> {
    const filename = `/data/local/tmp/${Math.random()
        .toString()
        .substring(2)}.apk`;

    let sync!: AdbSync;
    return new WrapWritableStream<Uint8Array>({
        async start() {
            // TODO: install: support other install apk methods (streaming, etc.)
            // TODO: install: support split apk formats (`adb install-multiple`)

            // Upload apk file to tmp folder
            sync = await adb.sync();
            return sync.write(filename, undefined, undefined);
        },
        async close() {
            await sync.dispose();

            // Invoke `pm install` to install it
            await adb.subprocess.spawnAndWaitLegacy([
                "pm",
                "install",
                escapeArg(filename),
            ]);

            // Remove the temp file
            await adb.rm(filename);
        },
    });
}
