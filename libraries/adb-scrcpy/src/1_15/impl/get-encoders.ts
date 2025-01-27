import type { Adb } from "@yume-chan/adb";
import type { ScrcpyEncoder, ScrcpyOptions1_15 } from "@yume-chan/scrcpy";

import { AdbScrcpyClient } from "../../client.js";
import type { AdbScrcpyOptions } from "../../types.js";

export async function getEncoders(
    adb: Adb,
    path: string,
    options: AdbScrcpyOptions<Pick<ScrcpyOptions1_15.Init, "tunnelForward">>,
): Promise<ScrcpyEncoder[]> {
    const client = await AdbScrcpyClient.start(adb, path, options);

    const encoders: ScrcpyEncoder[] = [];

    for await (const line of client.stdout) {
        const encoder = options.parseEncoder(line);
        if (encoder) {
            encoders.push(encoder);
        }
    }

    return encoders;
}
