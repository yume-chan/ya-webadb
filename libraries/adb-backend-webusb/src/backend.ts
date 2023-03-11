import type { AdbBackend, AdbPacketData, AdbPacketInit } from "@yume-chan/adb";
import { AdbPacketHeader, AdbPacketSerializeStream } from "@yume-chan/adb";
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
import type { StructDeserializeStream } from "@yume-chan/struct";
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

class Uint8ArrayStructDeserializeStream implements StructDeserializeStream {
    private buffer: Uint8Array;

    private offset: number;

    public constructor(buffer: Uint8Array) {
        this.buffer = buffer;
        this.offset = 0;
    }

    public read(length: number): Uint8Array {
        const result = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return result;
    }
}

export class AdbWebUsbBackendStream
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

        const factory = new DuplexStreamFactory<
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
                factory.dispose().catch((e) => {
                    void e;
                });
            }
        }

        usbManager.addEventListener("disconnect", handleUsbDisconnect);

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
                    const stream = new Uint8ArrayStructDeserializeStream(
                        buffer
                    );

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

        const zeroMask = outEndpoint.packetSize - 1;
        this._writable = pipeFrom(
            factory.createWritable(
                new ConsumableWritableStream({
                    write: async (chunk) => {
                        try {
                            await device.transferOut(
                                outEndpoint.endpointNumber,
                                chunk
                            );

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

export class AdbWebUsbBackend implements AdbBackend {
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
     * Create a new instance of `AdbWebBackend` using a specified `USBDevice` instance
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
        return new AdbWebUsbBackendStream(
            this._device,
            inEndpoint,
            outEndpoint,
            this._usb
        );
    }
}
