import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptionsInit2_0,
} from "@yume-chan/scrcpy";

import { AdbScrcpyClient, AdbScrcpyExitedError } from "../client.js";
import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import type { AdbScrcpyOptions } from "./types.js";
import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions2_0 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit2_0> {
    static async getEncoders(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<object>,
    ): Promise<ScrcpyEncoder[]> {
        try {
            // Similar to `AdbScrcpyOptions1_16.getDisplays`,
            // server start process won't complete and `start `will throw
            const client = await AdbScrcpyClient.start(
                adb,
                path,
                version,
                options,
            );

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
        version: string,
    ): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions2_0.getEncoders(adb, path, version, this);
    }

    override getDisplays(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyDisplay[]> {
        return AdbScrcpyOptions1_16.getDisplays(adb, path, version, this);
    }

    override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: this.value.scid.value,
                video: true,
                audio: this.value.audio,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
            },
            this.tunnelForwardOverride || this.value.tunnelForward,
        );
    }
}
