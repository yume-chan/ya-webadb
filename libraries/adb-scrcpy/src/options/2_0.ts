import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions1_16Impl,
    ScrcpyOptions2_0Impl,
} from "@yume-chan/scrcpy";
import { toScrcpyOptionValue } from "@yume-chan/scrcpy";

import { AdbScrcpyClient, AdbScrcpyExitedError } from "../client.js";
import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions2_0 extends AdbScrcpyOptions<
    // Only pick options that are used in this class,
    // so changes in `ScrcpyOptionsInitX_XX` won't affect type assignability with this class
    Pick<
        ScrcpyOptions2_0Impl.Init,
        "tunnelForward" | "control" | "sendDummyByte" | "scid" | "audio"
    >
> {
    static async getEncoders(
        adb: Adb,
        path: string,
        options: AdbScrcpyOptions<
            Pick<ScrcpyOptions1_16Impl.Init, "tunnelForward">
        >,
    ): Promise<ScrcpyEncoder[]> {
        try {
            // Similar to `AdbScrcpyOptions1_16.getDisplays`,
            // server start procedure won't complete and `start `will throw
            const client = await AdbScrcpyClient.start(adb, path, options);

            // If the server didn't exit, manually stop it and throw an error
            await client.close();
            throw new Error("Unexpected server output");
        } catch (e) {
            if (e instanceof AdbScrcpyExitedError) {
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

    override async getEncoders(
        adb: Adb,
        path: string,
    ): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions2_0.getEncoders(adb, path, this);
    }

    override getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]> {
        return AdbScrcpyOptions1_16.getDisplays(adb, path, this);
    }

    override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: toScrcpyOptionValue(this.value.scid, undefined),
                video: true, // Always enabled
                audio: this.value.audio,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
            },
            this.value.tunnelForward,
        );
    }
}
