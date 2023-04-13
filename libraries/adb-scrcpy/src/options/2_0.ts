import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptionsInit2_0,
} from "@yume-chan/scrcpy";

import { AdbScrcpyClient, AdbScrcpyExitedError } from "../client.js";
import type { AdbScrcpyConnection } from "../connection.js";

import { AdbScrcpyOptions1_16 } from "./1_16.js";
import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions2_0 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit2_0> {
    public override async getEncoders(
        adb: Adb,
        path: string,
        version: string
    ): Promise<ScrcpyEncoder[]> {
        try {
            const client = await AdbScrcpyClient.start(
                adb,
                path,
                version,
                this
            );
            await client.close();
        } catch (e) {
            if (e instanceof AdbScrcpyExitedError) {
                const encoders: ScrcpyEncoder[] = [];
                for (const line of e.output) {
                    const encoder = this.parseEncoder(line);
                    if (encoder) {
                        encoders.push(encoder);
                    }
                }
                return encoders;
            }
        }
        throw new Error("Unexpected error");
    }

    public override getDisplays(
        adb: Adb,
        path: string,
        version: string
    ): Promise<ScrcpyDisplay[]> {
        return AdbScrcpyOptions1_16.getDisplays(adb, path, version, this);
    }

    public override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: this.value.scid.value,
                control: this.value.control,
                sendDummyByte: this.value.sendDummyByte,
                audio: this.value.audio,
            },
            this.tunnelForwardOverride || this.value.tunnelForward
        );
    }
}
