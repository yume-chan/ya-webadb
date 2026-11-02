import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyEncoder,
    ScrcpyOptions1_17,
    ScrcpyOptionsListEncoders,
} from "@yume-chan/scrcpy";

import { AdbScrcpyClient } from "../../client.js";
import type { AdbScrcpyOptions } from "../../types.js";

export async function getEncoders(
    adb: Adb,
    path: string,
    options: AdbScrcpyOptions<Pick<ScrcpyOptions1_17.Init, "tunnelForward">> &
        ScrcpyOptionsListEncoders,
): Promise<ScrcpyEncoder[]> {
    const client = await AdbScrcpyClient.start(adb, path, options);

    const encoders: ScrcpyEncoder[] = [];

    for await (const line of client.output) {
        const encoder = options.parseEncoder(line);
        if (encoder) {
            encoders.push(encoder);
        }
    }

    return encoders;
}
