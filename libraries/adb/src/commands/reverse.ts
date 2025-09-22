// cspell: ignore killforward

import { BufferedReadableStream } from "@yume-chan/stream-extra";
import {
    encodeUtf8,
    ExactReadableEndedError,
    extend,
    string,
    struct,
} from "@yume-chan/struct";

import type { AdbIncomingSocketHandler } from "../adb.js";
import { hexToNumber, sequenceEqual } from "../utils/index.js";

import { AdbServiceBase } from "./base.js";

export interface AdbForwardListener {
    deviceSerial: string;

    localName: string;

    remoteName: string;
}

const AdbReverseStringResponse = struct(
    {
        length: string(4),
        content: string({
            field: "length",
            convert(value: string) {
                return Number.parseInt(value, 16);
            },
            back(value) {
                return value.toString(16).padStart(4, "0");
            },
        }),
    },
    { littleEndian: true },
);

export class AdbReverseError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class AdbReverseNotSupportedError extends AdbReverseError {
    constructor() {
        super(
            "ADB reverse tunnel is not supported on this device when connected wirelessly.",
        );
    }
}

export const AdbReverseErrorResponse = extend(
    AdbReverseStringResponse,
    {},
    {
        postDeserialize(value) {
            // https://issuetracker.google.com/issues/37066218
            // ADB on Android <9 can't create reverse tunnels when connected wirelessly (ADB over Wi-Fi),
            // and returns this confusing "more than one device/emulator" error.
            if (value.content === "more than one device/emulator") {
                throw new AdbReverseNotSupportedError();
            } else {
                throw new AdbReverseError(value.content);
            }
        },
    },
);

// Like `hexToNumber`, it's much faster than first converting `buffer` to a string
function decimalToNumber(buffer: Uint8Array) {
    let value = 0;
    for (const byte of buffer) {
        // Like `parseInt`, return when it encounters a non-digit character
        if (byte < 48 || byte > 57) {
            return value;
        }
        value = value * 10 + byte - 48;
    }
    return value;
}

const OKAY = encodeUtf8("OKAY");

export class AdbReverseService extends AdbServiceBase {
    readonly #deviceAddressToLocalAddress = new Map<string, string>();

    protected async createBufferedStream(service: string) {
        const socket = await this.adb.createSocket(service);
        return new BufferedReadableStream(socket.readable);
    }

    protected async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);

        const response = await stream.readExactly(4);
        if (!sequenceEqual(response, OKAY)) {
            await AdbReverseErrorResponse.deserialize(stream);
        }

        return stream;
    }

    /**
     * Get a list of all reverse port forwarding on the device.
     */
    async list(): Promise<AdbForwardListener[]> {
        const stream = await this.createBufferedStream("reverse:list-forward");

        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content
            .split("\n")
            .filter((line) => !!line)
            .map((line) => {
                const [deviceSerial, localName, remoteName] = line.split(
                    " ",
                ) as [string, string, string];
                return { deviceSerial, localName, remoteName };
            });

        // No need to close the stream, device will close it
    }

    /**
     * Add a reverse port forwarding for a program that already listens on a port.
     */
    async addExternal(deviceAddress: string, localAddress: string) {
        const stream = await this.sendRequest(
            `reverse:forward:${deviceAddress};${localAddress}`,
        );

        // `tcp:0` tells the device to pick an available port.
        // On Android >=8, device will respond with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith("tcp:")) {
            const position = stream.position;
            try {
                const length = hexToNumber(await stream.readExactly(4));
                const port = decimalToNumber(await stream.readExactly(length));
                deviceAddress = `tcp:${port}`;
            } catch (e) {
                if (
                    e instanceof ExactReadableEndedError &&
                    stream.position === position
                ) {
                    // Android <8 doesn't have this response.
                    // (the stream is closed now)
                    // Can be safely ignored.
                } else {
                    throw e;
                }
            }
        }

        return deviceAddress;
    }

    /**
     * Add a reverse port forwarding.
     */
    async add(
        deviceAddress: string,
        handler: AdbIncomingSocketHandler,
        localAddress?: string,
    ): Promise<string> {
        localAddress = await this.adb.transport.addReverseTunnel(
            handler,
            localAddress,
        );

        try {
            deviceAddress = await this.addExternal(deviceAddress, localAddress);
            this.#deviceAddressToLocalAddress.set(deviceAddress, localAddress);
            return deviceAddress;
        } catch (e) {
            await this.adb.transport.removeReverseTunnel(localAddress);
            throw e;
        }
    }

    /**
     * Remove a reverse port forwarding.
     */
    async remove(deviceAddress: string): Promise<void> {
        const localAddress =
            this.#deviceAddressToLocalAddress.get(deviceAddress);
        if (localAddress) {
            await this.adb.transport.removeReverseTunnel(localAddress);
        }

        await this.sendRequest(`reverse:killforward:${deviceAddress}`);

        // No need to close the stream, device will close it
    }

    /**
     * Remove all reverse port forwarding, including the ones added by other programs.
     */
    async removeAll(): Promise<void> {
        await this.adb.transport.clearReverseTunnels();
        this.#deviceAddressToLocalAddress.clear();

        await this.sendRequest(`reverse:killforward-all`);

        // No need to close the stream, device will close it
    }
}
