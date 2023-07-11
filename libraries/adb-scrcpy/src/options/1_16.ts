import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptionsInit1_16,
} from "@yume-chan/scrcpy";
import { WritableStream } from "@yume-chan/stream-extra";

import { AdbScrcpyClient, AdbScrcpyExitedError } from "../client.js";
import type {
    AdbScrcpyConnection,
    AdbScrcpyConnectionOptions,
} from "../connection.js";
import {
    AdbScrcpyForwardConnection,
    AdbScrcpyReverseConnection,
} from "../connection.js";

import type { AdbScrcpyOptions } from "./types.js";
import { AdbScrcpyOptionsBase } from "./types.js";

export class AdbScrcpyOptions1_16 extends AdbScrcpyOptionsBase<ScrcpyOptionsInit1_16> {
    static createConnection(
        adb: Adb,
        connectionOptions: AdbScrcpyConnectionOptions,
        tunnelForward: boolean,
    ): AdbScrcpyConnection {
        if (tunnelForward) {
            return new AdbScrcpyForwardConnection(adb, connectionOptions);
        } else {
            return new AdbScrcpyReverseConnection(adb, connectionOptions);
        }
    }

    static async getEncoders(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<object>,
    ): Promise<ScrcpyEncoder[]> {
        const client = await AdbScrcpyClient.start(adb, path, version, options);

        const encoders: ScrcpyEncoder[] = [];
        await client.stdout.pipeTo(
            new WritableStream({
                write: (line) => {
                    const encoder = options.parseEncoder(line);
                    if (encoder) {
                        encoders.push(encoder);
                    }
                },
            }),
        );

        return encoders;
    }

    static async getDisplays(
        adb: Adb,
        path: string,
        version: string,
        options: AdbScrcpyOptions<object>,
    ): Promise<ScrcpyDisplay[]> {
        try {
            // Server will exit before opening connections when an invalid display id was given
            // so `start` will throw an `AdbScrcpyExitedError`
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

    override getEncoders(
        adb: Adb,
        path: string,
        version: string,
    ): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions1_16.getEncoders(adb, path, version, this);
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
                scid: -1,
                video: true,
                audio: false,
                // Old versions always have control stream no matter what the option is
                // Pass `control: false` to `Connection` will disable the control stream
                control: true,
                sendDummyByte: true,
            },
            this.tunnelForwardOverride || this.value.tunnelForward,
        );
    }
}
