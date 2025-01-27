import type { Adb } from "@yume-chan/adb";
import type { ScrcpyDisplay, ScrcpyOptions1_15 } from "@yume-chan/scrcpy";

import { AdbScrcpyClient, AdbScrcpyExitedError } from "../../client.js";
import type { AdbScrcpyOptions } from "../../types.js";

export async function getDisplays(
    adb: Adb,
    path: string,
    options: AdbScrcpyOptions<Pick<ScrcpyOptions1_15.Init, "tunnelForward">>,
): Promise<ScrcpyDisplay[]> {
    try {
        // Server will exit before opening connections when an invalid display id was given
        // so `start` will throw an `AdbScrcpyExitedError`
        const client = await AdbScrcpyClient.start(adb, path, options);

        // If the server didn't exit, manually stop it and throw an error
        await client.close();
        throw new Error("Unexpected server output");
    } catch (e) {
        if (e instanceof AdbScrcpyExitedError) {
            if (e.output[0]?.startsWith("[server] ERROR:")) {
                throw e;
            }

            const displays: ScrcpyDisplay[] = [];
            for (const line of e.output) {
                const display = options.parseDisplay(line);
                if (display) {
                    displays.push(display);
                }
            }
            return displays;
        }

        throw e;
    }
}
