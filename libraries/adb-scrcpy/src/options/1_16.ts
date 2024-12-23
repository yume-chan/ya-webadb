import type { Adb } from "@yume-chan/adb";
import type {
    ScrcpyDisplay,
    ScrcpyEncoder,
    ScrcpyOptions1_16Impl,
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

import { AdbScrcpyOptions } from "./types.js";

export class AdbScrcpyOptions1_16 extends AdbScrcpyOptions<
    // Only pick options that are used in this class,
    // so changes in `ScrcpyOptionsInitX_XX` won't affect type assignability with this class
    Pick<ScrcpyOptions1_16Impl.Init, "tunnelForward">
> {
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
        options: AdbScrcpyOptions<
            Pick<ScrcpyOptions1_16Impl.Init, "tunnelForward">
        >,
    ): Promise<ScrcpyEncoder[]> {
        const client = await AdbScrcpyClient.start(adb, path, options);

        const encoders: ScrcpyEncoder[] = [];

        // `client.stdout` is supplied by user and may not support async iteration
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
        options: AdbScrcpyOptions<
            Pick<ScrcpyOptions1_16Impl.Init, "tunnelForward">
        >,
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

    override getEncoders(adb: Adb, path: string): Promise<ScrcpyEncoder[]> {
        return AdbScrcpyOptions1_16.getEncoders(adb, path, this);
    }

    override getDisplays(adb: Adb, path: string): Promise<ScrcpyDisplay[]> {
        return AdbScrcpyOptions1_16.getDisplays(adb, path, this);
    }

    override createConnection(adb: Adb): AdbScrcpyConnection {
        return AdbScrcpyOptions1_16.createConnection(
            adb,
            {
                scid: undefined, // Not Supported
                video: true, // Always enabled
                audio: false, // Not Supported
                control: true, // Always enabled even when `--no-control` is specified
                sendDummyByte: true, // Always enabled
            },
            this.value.tunnelForward,
        );
    }
}
