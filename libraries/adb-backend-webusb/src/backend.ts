import {
    AdbPacketHeader,
    AdbPacketSerializeStream,
    type AdbBackend,
    type AdbPacketData,
    type AdbPacketInit,
} from "@yume-chan/adb";
import {
    DuplexStreamFactory,
    ReadableStream,
    WritableStream,
    pipeFrom,
    type ReadableWritablePair,
} from "@yume-chan/stream-extra";
import { EMPTY_UINT8_ARRAY, type ExactReadable } from "@yume-chan/struct";

const NOOP = () => {
    /* empty */
};

/**
 * `classCode`, `subclassCode` and `protocolCode` are required
 * for selecting correct USB configuration and interface.
 */
export type AdbDeviceFilter = USBDeviceFilter &
    Required<
        Pick<USBDeviceFilter, "classCode" | "subclassCode" | "protocolCode">
    >;

export const ADB_DEFAULT_DEVICE_FILTER = {
    classCode: 0xff,
    subclassCode: 0x42,
    protocolCode: 1,
} as const satisfies AdbDeviceFilter;

function alternateMatchesFilter(
    alternate: USBAlternateInterface,
    filters: AdbDeviceFilter[]
) {
    return filters.some(
        (filter) =>
            alternate.interfaceClass === filter.classCode &&
            alternate.interfaceSubclass === filter.subclassCode &&
            alternate.interfaceProtocol === filter.protocolCode
    );
}

function findUsbAlternateInterface(
    device: USBDevice,
    filters: AdbDeviceFilter[]
) {
    for (const configuration of device.configurations) {
        for (const interface_ of configuration.interfaces) {
            for (const alternate of interface_.alternates) {
                if (alternateMatchesFilter(alternate, filters)) {
                    return { configuration, interface_, alternate };
                }
            }
        }
    }

    throw new Error("No matched alternate interface found");
}

/**
 * Find the first pair of input and output endpoints from an alternate interface.
 *
 * ADB interface only has two endpoints, one for input and one for output.
 */
function findUsbEndpoints(endpoints: USBEndpoint[]) {
    if (endpoints.length === 0) {
        throw new Error("No endpoints given");
    }

    let inEndpoint: USBEndpoint | undefined;
    let outEndpoint: USBEndpoint | undefined;

    for (const endpoint of endpoints) {
        switch (endpoint.direction) {
            case "in":
                inEndpoint = endpoint;
                if (outEndpoint) {
                    return { inEndpoint, outEndpoint };
                }
                break;
            case "out":
                outEndpoint = endpoint;
                if (inEndpoint) {
                    return { inEndpoint, outEndpoint };
                }
                break;
        }
    }

    if (!inEndpoint) {
        throw new Error("No input endpoint found.");
    }
    if (!outEndpoint) {
        throw new Error("No output endpoint found.");
    }
    throw new Error("unreachable");
}

class Uint8ArrayExactReadable implements ExactReadable {
    private _data: Uint8Array;
    private _position: number;

    public get position() {
        return this._position;
    }

    public constructor(data: Uint8Array) {
        this._data = data;
        this._position = 0;
    }

    public readExactly(length: number): Uint8Array {
        const result = this._data.subarray(
            this._position,
            this._position + length
        );
        this._position += length;
        return result;
    }
}

export class AdbWebUsbBackendStream
    implements ReadableWritablePair<AdbPacketData, AdbPacketInit>
{
    private _readable: ReadableStream<AdbPacketData>;
    public get readable() {
        return this._readable;
    }

    private _writable: WritableStream<AdbPacketInit>;
    public get writable() {
        return this._writable;
    }

    public constructor(
        device: USBDevice,
        inEndpoint: USBEndpoint,
        outEndpoint: USBEndpoint
    ) {
        let closed = false;

        const factory = new DuplexStreamFactory<AdbPacketData, Uint8Array>({
            close: async () => {
                try {
                    closed = true;
                    await device.close();
                } catch {
                    /* device may have already disconnected */
                }
            },
            dispose: () => {
                navigator.usb.removeEventListener(
                    "disconnect",
                    handleUsbDisconnect
                );
            },
        });

        function handleUsbDisconnect(e: USBConnectionEvent) {
            if (e.device === device) {
                factory.dispose().catch(NOOP);
            }
        }

        navigator.usb.addEventListener("disconnect", handleUsbDisconnect);

        this._readable = factory.wrapReadable(
            new ReadableStream<AdbPacketData>({
                async pull(controller) {
                    // The `length` argument in `transferIn` must not be smaller than what the device sent,
                    // otherwise it will return `babble` status without any data.
                    // Here we read exactly 24 bytes (packet header) followed by exactly `payloadLength`.
                    const result = await device.transferIn(
                        inEndpoint.endpointNumber,
                        24
                    );

                    // TODO: webusb: handle `babble` by discarding the data and receive again
                    // TODO: webusb: on Windows, `transferIn` throws an NetworkError when device disconnected, check with other OSs.

                    // From spec, the `result.data` always covers the whole `buffer`.
                    const buffer = new Uint8Array(result.data!.buffer);
                    const stream = new Uint8ArrayExactReadable(buffer);

                    // Add `payload` field to its type, because we will assign `payload` in next step.
                    const packet = AdbPacketHeader.deserialize(
                        stream
                    ) as AdbPacketHeader & { payload: Uint8Array };
                    if (packet.payloadLength !== 0) {
                        const result = await device.transferIn(
                            inEndpoint.endpointNumber,
                            packet.payloadLength
                        );
                        packet.payload = new Uint8Array(result.data!.buffer);
                    } else {
                        packet.payload = EMPTY_UINT8_ARRAY;
                    }

                    controller.enqueue(packet);
                },
            })
        );

        this._writable = pipeFrom(
            factory.createWritable(
                new WritableStream(
                    {
                        write: async (chunk) => {
                            try {
                                await device.transferOut(
                                    outEndpoint.endpointNumber,
                                    chunk
                                );
                            } catch (e) {
                                if (closed) {
                                    return;
                                }
                                throw e;
                            }
                        },
                    },
                    {
                        highWaterMark: 16 * 1024,
                        size(chunk) {
                            return chunk.byteLength;
                        },
                    }
                )
            ),
            new AdbPacketSerializeStream()
        );
    }
}

export class AdbWebUsbBackend implements AdbBackend {
    /**
     * Check if WebUSB API is supported by the browser.
     *
     * @returns `true` if WebUSB is supported by the current browser.
     */
    public static isSupported(): boolean {
        return !!globalThis.navigator?.usb;
    }

    /**
     * Request access to a connected device from browser.
     * The browser will display a list of devices to the user and let them choose one.
     *
     * Only available in browsers that support WebUSB API (When `isSupported()` returns `true`).
     *
     * @param filters
     * The filters to apply to the device list.
     *
     * It must have `classCode`, `subclassCode` and `protocolCode` fields for selecting the ADB interface,
     * but can also have `vendorId`, `productId` or `serialNumber` fields to limit the displayed device list.
     * @returns The `AdbWebUsbBackend` instance if the user selected a device, or `undefined` if the user cancelled the device picker.
     */
    public static async requestDevice(
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ): Promise<AdbWebUsbBackend | undefined> {
        try {
            const device = await navigator.usb.requestDevice({
                filters,
            });
            return new AdbWebUsbBackend(device, filters);
        } catch (e) {
            // User cancelled the device picker
            if (e instanceof DOMException && e.name === "NotFoundError") {
                return undefined;
            }

            throw e;
        }
    }

    public static async getDevices(
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ): Promise<AdbWebUsbBackend[]> {
        const devices = await window.navigator.usb.getDevices();
        return devices.map((device) => new AdbWebUsbBackend(device, filters));
    }

    private _filters: AdbDeviceFilter[];
    private _device: USBDevice;
    public get device() {
        return this._device;
    }

    public get serial(): string {
        return this._device.serialNumber!;
    }

    public get name(): string {
        return this._device.productName!;
    }

    /**
     * Create a new instance of `AdbWebBackend` using a `USBDevice` instance you already have.
     *
     * @param device The `USBDevice` instance you already have.
     * @param filters The filters to use when searching for ADB interface. The default value is `[{ classCode: 0xff, subclassCode: 0x42, protocolCode: 0x1 }]`, defined by Google.
     */
    public constructor(
        device: USBDevice,
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ) {
        this._device = device;
        this._filters = filters;
    }

    /**
     * Claim the device and create a pair of `AdbPacket` streams to the ADB interface.
     * @returns The pair of `AdbPacket` streams.
     */
    public async connect(): Promise<
        ReadableWritablePair<AdbPacketData, AdbPacketInit>
    > {
        if (!this._device.opened) {
            await this._device.open();
        }

        const { configuration, interface_, alternate } =
            findUsbAlternateInterface(this._device, this._filters);

        if (
            this._device.configuration?.configurationValue !==
            configuration.configurationValue
        ) {
            // Note: Switching configuration is not supported on Windows,
            // but Android devices should always expose ADB function at the first (default) configuration.
            await this._device.selectConfiguration(
                configuration.configurationValue
            );
        }

        if (!interface_.claimed) {
            await this._device.claimInterface(interface_.interfaceNumber);
        }

        if (
            interface_.alternate.alternateSetting !== alternate.alternateSetting
        ) {
            await this._device.selectAlternateInterface(
                interface_.interfaceNumber,
                alternate.alternateSetting
            );
        }

        const { inEndpoint, outEndpoint } = findUsbEndpoints(
            alternate.endpoints
        );
        return new AdbWebUsbBackendStream(
            this._device,
            inEndpoint,
            outEndpoint
        );
    }
}
