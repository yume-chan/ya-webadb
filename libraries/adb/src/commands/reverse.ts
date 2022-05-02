// cspell: ignore killforward

import { AutoDisposable } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import type { Adb } from "../adb.js";
import type { AdbIncomingSocketHandler, AdbSocket } from '../socket/index.js';
import { AdbBufferedStream, BufferedStreamEndedError } from '../stream/index.js';
import { decodeUtf8 } from "../utils/index.js";

export interface AdbForwardListener {
    deviceSerial: string;

    localName: string;

    remoteName: string;
}

const AdbReverseStringResponse =
    new Struct()
        .string('length', { length: 4 })
        .string('content', { lengthField: 'length', lengthFieldRadix: 16 });

const AdbReverseErrorResponse =
    new Struct()
        .fields(AdbReverseStringResponse)
        .postDeserialize((value) => {
            throw new Error(value.content);
        });

export class AdbReverseCommand extends AutoDisposable {
    protected localAddressToHandler = new Map<string, AdbIncomingSocketHandler>();

    protected deviceAddressToLocalAddress = new Map<string, string>();

    protected adb: Adb;

    protected listening = false;

    public constructor(adb: Adb) {
        super();

        this.adb = adb;
        this.addDisposable(this.adb.addIncomingSocketHandler(this.handleIncomingSocket));
    }

    protected handleIncomingSocket = async (socket: AdbSocket) => {
        let address = socket.serviceString;
        // ADB daemon appends `\0` to the service string
        address = address.replace(/\0/g, '');
        return !!(await this.localAddressToHandler.get(address)?.(socket));
    };

    private async createBufferedStream(service: string) {
        const socket = await this.adb.createSocket(service);
        return new AdbBufferedStream(socket);
    }

    private async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);
        const success = decodeUtf8(await stream.read(4)) === 'OKAY';
        if (!success) {
            await AdbReverseErrorResponse.deserialize(stream);
        }
        return stream;
    }

    public async list(): Promise<AdbForwardListener[]> {
        const stream = await this.createBufferedStream('reverse:list-forward');

        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content!.split('\n').map(line => {
            const [deviceSerial, localName, remoteName] = line.split(' ') as [string, string, string];
            return { deviceSerial, localName, remoteName };
        });

        // No need to close the stream, device will close it
    }

    /**
     * @param deviceAddress The address adbd on device is listening on. Can be `tcp:0` to let adbd choose an available TCP port by itself.
     * @param localAddress Native ADB client will open a connection to this address when reverse connection received. In WebADB, it's only used to uniquely identify a reverse tunnel registry, `handler` will be called to handle the connection.
     * @param handler A callback to handle incoming connections
     * @returns If `deviceAddress` is `tcp:0`, return `tcp:{ACTUAL_LISTENING_PORT}`; otherwise, return `deviceAddress`.
     */
    public async add(
        deviceAddress: string,
        localAddress: string,
        handler: AdbIncomingSocketHandler,
    ): Promise<string> {
        const stream = await this.sendRequest(`reverse:forward:${deviceAddress};${localAddress}`);

        // `tcp:0` tells the device to pick an available port.
        // Begin with Android 8, device will respond with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith('tcp:')) {
            let length: number | undefined;
            try {
                length = Number.parseInt(decodeUtf8(await stream.read(4)), 16);
            } catch (e) {
                if (!(e instanceof BufferedStreamEndedError)) {
                    throw e;
                }

                // Device before Android 8 doesn't have this response.
                // (the stream is closed now)
                // Can be safely ignored.
            }

            if (length !== undefined) {
                const port = decodeUtf8(await stream.read(length!));
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
            this.localAddressToHandler.delete(this.deviceAddressToLocalAddress.get(deviceAddress)!);
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
