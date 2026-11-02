import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyEncoder,
    ScrcpyOptions2_0,
    ScrcpyOptionsListEncoders,
} from "@yume-chan/scrcpy";

import { AdbScrcpyClient, AdbScrcpyExitedError } from "../../client.js";
import type { AdbScrcpyOptions } from "../../types.js";

export async function getEncoders(
    adb: Adb,
    path: string,
    options: AdbScrcpyOptions<Pick<ScrcpyOptions2_0.Init, "tunnelForward">> &
        ScrcpyOptionsListEncoders,
): Promise<ScrcpyEncoder[]> {
    try {
        // Similar to `getDisplays`, now the server won't create video sockets,
        // so `start` will throw an `AdbScrcpyExitedError` instead
        const client = await AdbScrcpyClient.start(adb, path, options);

        // If the server didn't exit, manually stop it and throw an error
        await client.close();
        throw new Error("Unexpected server output");
    } catch (e) {
        if (e instanceof AdbScrcpyExitedError) {
            if (e.output[0]?.startsWith("[server] ERROR:")) {
                throw e;
            }

            const encoders: ScrcpyEncoder[] = [];
            for (const line of e.output) {
                const encoder = options.parseEncoder(line);
                if (encoder) {
                    encoders.push(encoder);
                }
            }
            return encoders;
        }

        throw e;
    }
}
