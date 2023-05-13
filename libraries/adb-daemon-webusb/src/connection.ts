import type {
    AdbDaemonConnection,
    AdbPacketData,
    AdbPacketInit,
} from "@yume-chan/adb";
import {
    AdbPacketHeader,
    AdbPacketSerializeStream,
    unreachable,
} from "@yume-chan/adb";
import type {
    Consumable,
    ReadableWritablePair,
    WritableStream,
} from "@yume-chan/stream-extra";
import {
    ConsumableWritableStream,
    DuplexStreamFactory,
    ReadableStream,
    pipeFrom,
} from "@yume-chan/stream-extra";
import type { ExactReadable } from "@yume-chan/struct";
import { EMPTY_UINT8_ARRAY } from "@yume-chan/struct";

/**
 * `classCode`, `subclassCode` and `protocolCode` are required
 * for selecting correct USB configuration and interface.
 */
export type AdbDeviceFilter = USBDeviceFilter &
    Required<
        Pick<USBDeviceFilter, "classCode" | "subclassCode" | "protocolCode">
    >;

/**
 * The default filter for ADB devices, as defined by Google.
 */
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

export class AdbDaemonWebUsbConnectionStreams
    implements ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
{
    private _readable: ReadableStream<AdbPacketData>;
    public get readable() {
        return this._readable;
    }

    private _writable: WritableStream<Consumable<AdbPacketInit>>;
    public get writable() {
        return this._writable;
    }

    public constructor(
        device: USBDevice,
        inEndpoint: USBEndpoint,
        outEndpoint: USBEndpoint,
        usbManager: USB
    ) {
        let closed = false;

        const duplex = new DuplexStreamFactory<
            AdbPacketData,
            Consumable<Uint8Array>
        >({
            close: async () => {
                try {
                    closed = true;
                    await device.close();
                } catch {
                    /* device may have already disconnected */
                }
            },
            dispose: () => {
                usbManager.removeEventListener(
                    "disconnect",
                    handleUsbDisconnect
                );
            },
        });

        function handleUsbDisconnect(e: USBConnectionEvent) {
            if (e.device === device) {
                duplex.dispose().catch(unreachable);
            }
        }

        usbManager.addEventListener("disconnect", handleUsbDisconnect);

        this._readable = duplex.wrapReadable(
            new ReadableStream<AdbPacketData>({
                async pull(controller) {
                    // The `length` argument in `transferIn` must not be smaller than what the device sent,
                    // otherwise it will return `babble` status without any data.
                    // ADB daemon sends each packet in two parts, the 24-byte header and the payload.
                    const result = await device.transferIn(
                        inEndpoint.endpointNumber,
                        24
                    );

                    // TODO: webusb: handle `babble` by discarding the data and receive again
                    // TODO: webusb: on Windows, `transferIn` throws an NetworkError when device disconnected, check with other OSs.

                    // From spec, the `result.data` always covers the whole `buffer`.
                    const buffer = new Uint8Array(result.data!.buffer);
                    const stream = new Uint8ArrayExactReadable(buffer);

                    // Add `payload` field to its type, it's assigned below.
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

        const zeroMask = outEndpoint.packetSize - 1;
        this._writable = pipeFrom(
            duplex.createWritable(
                new ConsumableWritableStream({
                    write: async (chunk) => {
                        try {
                            await device.transferOut(
                                outEndpoint.endpointNumber,
                                chunk
                            );

                            // In USB protocol, a not-full packet means the end of a transfer.
                            // If the payload size is a multiple of the packet size,
                            // we need to send an empty packet to indicate the end,
                            // so the OS will send it to the device immediately.
                            if (
                                zeroMask &&
                                (chunk.byteLength & zeroMask) === 0
                            ) {
                                await device.transferOut(
                                    outEndpoint.endpointNumber,
                                    EMPTY_UINT8_ARRAY
                                );
                            }
                        } catch (e) {
                            if (closed) {
                                return;
                            }
                            throw e;
                        }
                    },
                })
            ),
            new AdbPacketSerializeStream()
        );
    }
}

export class AdbDaemonWebUsbConnection implements AdbDaemonConnection {
    private _filters: AdbDeviceFilter[];
    private _usb: USB;

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
     * Create a new instance of `AdbDaemonWebUsbConnection` using a specified `USBDevice` instance
     *
     * @param device The `USBDevice` instance obtained elsewhere.
     * @param filters The filters to use when searching for ADB interface. Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
     */
    public constructor(
        device: USBDevice,
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER],
        usb: USB
    ) {
        this._device = device;
        this._filters = filters;
        this._usb = usb;
    }

    /**
     * Claim the device and create a pair of `AdbPacket` streams to the ADB interface.
     * @returns The pair of `AdbPacket` streams.
     */
    public async connect(): Promise<
        ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
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
        return new AdbDaemonWebUsbConnectionStreams(
            this._device,
            inEndpoint,
            outEndpoint,
            this._usb
        );
    }
}
