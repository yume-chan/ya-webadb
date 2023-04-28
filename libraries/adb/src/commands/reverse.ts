// cspell: ignore killforward

import { AutoDisposable } from "@yume-chan/event";
import { BufferedReadableStream } from "@yume-chan/stream-extra";
import Struct, { ExactReadableEndedError } from "@yume-chan/struct";

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
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class AdbReverseNotSupportedError extends AdbReverseError {
    public constructor() {
        super(
            "ADB reverse tunnel is not supported on this device when connected wirelessly."
        );
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
        if (address.endsWith("\0")) {
            address = address.substring(0, address.length - 1);
        }

        const handler = this.localAddressToHandler.get(address);
        if (!handler) {
            return false;
        }

        return await handler(socket);
    };

    private async createBufferedStream(service: string) {
        const socket = await this.adb.createSocket(service);
        return new BufferedReadableStream(socket.readable);
    }

    private async readString(stream: BufferedReadableStream, length: number) {
        const buffer = await stream.readExactly(length);
        return decodeUtf8(buffer);
    }

    private async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);
        const success = (await this.readString(stream, 4)) === "OKAY";
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
            const position = stream.position;
            try {
                const lengthString = await this.readString(stream, 4);
                const length = Number.parseInt(lengthString, 16);
                const port = await this.readString(stream, length);
                deviceAddress = `tcp:${Number.parseInt(port, 10)}`;
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
