import type {
    AdbDaemonDevice,
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

import type { AdbDeviceFilter } from "./utils.js";
import { findUsbAlternateInterface, isErrorName } from "./utils.js";

/**
 * The default filter for ADB devices, as defined by Google.
 */
export const ADB_DEFAULT_DEVICE_FILTER = {
    classCode: 0xff,
    subclassCode: 0x42,
    protocolCode: 1,
} as const satisfies AdbDeviceFilter;

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
    #data: Uint8Array;
    #position: number;

    public get position() {
        return this.#position;
    }

    public constructor(data: Uint8Array) {
        this.#data = data;
        this.#position = 0;
    }

    public readExactly(length: number): Uint8Array {
        const result = this.#data.subarray(
            this.#position,
            this.#position + length
        );
        this.#position += length;
        return result;
    }
}

export class AdbDaemonWebUsbConnection
    implements ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
{
    #readable: ReadableStream<AdbPacketData>;
    public get readable() {
        return this.#readable;
    }

    #writable: WritableStream<Consumable<AdbPacketInit>>;
    public get writable() {
        return this.#writable;
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
                closed = true;
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

        this.#readable = duplex.wrapReadable(
            new ReadableStream<AdbPacketData>({
                async pull(controller) {
                    try {
                        // The `length` argument in `transferIn` must not be smaller than what the device sent,
                        // otherwise it will return `babble` status without any data.
                        // ADB daemon sends each packet in two parts, the 24-byte header and the payload.
                        const result = await device.transferIn(
                            inEndpoint.endpointNumber,
                            24
                        );

                        // TODO: webusb: handle `babble` by discarding the data and receive again

                        // Per spec, the `result.data` always covers the whole `buffer`.
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
                            packet.payload = new Uint8Array(
                                result.data!.buffer
                            );
                        } else {
                            packet.payload = EMPTY_UINT8_ARRAY;
                        }

                        controller.enqueue(packet);
                    } catch (e) {
                        // On Windows, disconnecting the device will cause `NetworkError` to be thrown,
                        // even before the `disconnect` event is fired.
                        // We need to wait a little bit and check if the device is still connected.
                        // https://github.com/WICG/webusb/issues/219
                        if (isErrorName(e, "NetworkError")) {
                            await new Promise<void>((resolve) => {
                                setTimeout(() => {
                                    resolve();
                                }, 100);
                            });

                            if (closed) {
                                controller.close();
                            } else {
                                throw e;
                            }
                        }

                        throw e;
                    }
                },
            })
        );

        const zeroMask = outEndpoint.packetSize - 1;
        this.#writable = pipeFrom(
            duplex.createWritable(
                new ConsumableWritableStream({
                    write: async (chunk) => {
                        try {
                            await device.transferOut(
                                outEndpoint.endpointNumber,
                                chunk
                            );

                            // In USB protocol, a not-full packet indicates the end of a transfer.
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

export class AdbDaemonWebUsbDevice implements AdbDaemonDevice {
    #filters: AdbDeviceFilter[];
    #usbManager: USB;

    #raw: USBDevice;
    public get raw() {
        return this.#raw;
    }

    public get serial(): string {
        return this.#raw.serialNumber!;
    }

    public get name(): string {
        return this.#raw.productName!;
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
        usbManager: USB
    ) {
        this.#raw = device;
        this.#filters = filters;
        this.#usbManager = usbManager;
    }

    /**
     * Claim the device and create a pair of `AdbPacket` streams to the ADB interface.
     * @returns The pair of `AdbPacket` streams.
     */
    public async connect(): Promise<
        ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
    > {
        if (!this.#raw.opened) {
            await this.#raw.open();
        }

        const { configuration, interface_, alternate } =
            findUsbAlternateInterface(this.#raw, this.#filters);

        if (
            this.#raw.configuration?.configurationValue !==
            configuration.configurationValue
        ) {
            // Note: Switching configuration is not supported on Windows,
            // but Android devices should always expose ADB function at the first (default) configuration.
            await this.#raw.selectConfiguration(
                configuration.configurationValue
            );
        }

        if (!interface_.claimed) {
            await this.#raw.claimInterface(interface_.interfaceNumber);
        }

        if (
            interface_.alternate.alternateSetting !== alternate.alternateSetting
        ) {
            await this.#raw.selectAlternateInterface(
                interface_.interfaceNumber,
                alternate.alternateSetting
            );
        }

        const { inEndpoint, outEndpoint } = findUsbEndpoints(
            alternate.endpoints
        );
        return new AdbDaemonWebUsbConnection(
            this.#raw,
            inEndpoint,
            outEndpoint,
            this.#usbManager
        );
    }
}
