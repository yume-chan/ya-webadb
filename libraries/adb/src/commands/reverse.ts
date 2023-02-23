// cspell: ignore killforward

import { AutoDisposable } from "@yume-chan/event";
import {
    BufferedReadableStream,
    BufferedReadableStreamEndedError,
} from "@yume-chan/stream-extra";
import Struct from "@yume-chan/struct";

import type { Adb } from "../adb.js";
import type { AdbIncomingSocketHandler, AdbSocket } from "../socket/index.js";
import { decodeUtf8 } from "../utils/index.js";

export interface AdbForwardListener {
    deviceSerial: string;

    localName: string;

    remoteName: string;
}

const AdbReverseStringResponse = new Struct()
    .string("length", { length: 4 })
    .string("content", { lengthField: "length", lengthFieldRadix: 16 });

export class AdbReverseError extends Error {
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AdbReverseError.prototype);
    }
}

export class AdbReverseNotSupportedError extends Error {
    public constructor() {
        super(
            "ADB reverse tunnel is not supported on this device when connected wirelessly."
        );
        Object.setPrototypeOf(this, AdbReverseNotSupportedError.prototype);
    }
}

const AdbReverseErrorResponse = new Struct()
    .fields(AdbReverseStringResponse)
    .postDeserialize((value) => {
        // https://issuetracker.google.com/issues/37066218
        // ADB on Android <9 can't create reverse tunnels when connected wirelessly (ADB over WiFi),
        // and returns this confusing "more than one device/emulator" error.
        if (value.content === "more than one device/emulator") {
            throw new AdbReverseNotSupportedError();
        } else {
            throw new AdbReverseError(value.content);
        }
    });

export class AdbReverseCommand extends AutoDisposable {
    protected localAddressToHandler = new Map<
        string,
        AdbIncomingSocketHandler
    >();

    protected deviceAddressToLocalAddress = new Map<string, string>();

    protected adb: Adb;

    protected listening = false;

    public constructor(adb: Adb) {
        super();

        this.adb = adb;
        this.addDisposable(
            this.adb.onIncomingSocket(this.handleIncomingSocket)
        );
    }

    protected handleIncomingSocket = async (socket: AdbSocket) => {
        let address = socket.serviceString;
        // ADB daemon appends `\0` to the service string
        address = address.replace(/\0/g, "");
        return !!(await this.localAddressToHandler.get(address)?.(socket));
    };

    private async createBufferedStream(service: string) {
        const socket = await this.adb.createSocket(service);
        return new BufferedReadableStream(socket.readable);
    }

    private async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);
        const success = decodeUtf8(await stream.read(4)) === "OKAY";
        if (!success) {
            await AdbReverseErrorResponse.deserialize(stream);
        }
        return stream;
    }

    public async list(): Promise<AdbForwardListener[]> {
        const stream = await this.createBufferedStream("reverse:list-forward");

        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content!.split("\n").map((line) => {
            const [deviceSerial, localName, remoteName] = line.split(" ") as [
                string,
                string,
                string
            ];
            return { deviceSerial, localName, remoteName };
        });

        // No need to close the stream, device will close it
    }

    /**
     * @param deviceAddress
     * The address to be listened on device by ADB daemon. Or `tcp:0` to choose an available TCP port.
     * @param localAddress
     * An identifier for the reverse tunnel.
     *
     * When a socket wants to connect to {@link deviceAddress}, native ADB client will forward that connection to {@link localAddress}.
     * However in this library, the {@link handler} is invoked instead. So this parameter is only used to identify the reverse tunnel.
     * @param handler A callback to handle incoming connections. It must return `true` if it accepts the connection.
     * @returns `tcp:{ACTUAL_LISTENING_PORT}`, If `deviceAddress` is `tcp:0`; otherwise, `deviceAddress`.
     * @throws {AdbReverseNotSupportedError} If ADB reverse tunnel is not supported on this device when connected wirelessly.
     * @throws {AdbReverseError} If ADB daemon returns an error.
     */
    public async add(
        deviceAddress: string,
        localAddress: string,
        handler: AdbIncomingSocketHandler
    ): Promise<string> {
        const stream = await this.sendRequest(
            `reverse:forward:${deviceAddress};${localAddress}`
        );

        // `tcp:0` tells the device to pick an available port.
        // On Android >=8, device will respond with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith("tcp:")) {
            let length: number | undefined;
            try {
                length = Number.parseInt(decodeUtf8(await stream.read(4)), 16);
            } catch (e) {
                if (!(e instanceof BufferedReadableStreamEndedError)) {
                    throw e;
                }

                // Android <8 doesn't have this response.
                // (the stream is closed now)
                // Can be safely ignored.
            }

            if (length !== undefined) {
                const port = decodeUtf8(await stream.read(length));
                deviceAddress = `tcp:${Number.parseInt(port, 10)}`;
            }
        }

        this.localAddressToHandler.set(localAddress, handler);
        this.deviceAddressToLocalAddress.set(deviceAddress, localAddress);
        return deviceAddress;

        // No need to close the stream, device will close it
    }

    public async remove(deviceAddress: string): Promise<void> {
        await this.sendRequest(`reverse:killforward:${deviceAddress}`);

        if (this.deviceAddressToLocalAddress.has(deviceAddress)) {
            this.localAddressToHandler.delete(
                this.deviceAddressToLocalAddress.get(deviceAddress)!
            );
            this.deviceAddressToLocalAddress.delete(deviceAddress);
        }

        // No need to close the stream, device will close it
    }

    public async removeAll(): Promise<void> {
        await this.sendRequest(`reverse:killforward-all`);

        this.deviceAddressToLocalAddress.clear();
        this.localAddressToHandler.clear();

        // No need to close the stream, device will close it
    }
}
