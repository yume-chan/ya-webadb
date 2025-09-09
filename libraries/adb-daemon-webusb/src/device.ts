import type {
    AdbDaemonDevice,
    AdbPacketData,
    AdbPacketInit,
} from "@yume-chan/adb";
import {
    AdbPacketHeader,
    AdbPacketSerializeStream,
    toLocalUint8Array,
    unreachable,
} from "@yume-chan/adb";
import type {
    Consumable,
    ReadableWritablePair,
    WritableStream,
} from "@yume-chan/stream-extra";
import {
    DuplexStreamFactory,
    MaybeConsumable,
    ReadableStream,
    pipeFrom,
} from "@yume-chan/stream-extra";
import { EmptyUint8Array, Uint8ArrayExactReadable } from "@yume-chan/struct";

import { DeviceBusyError as _DeviceBusyError } from "./error.js";
import type { UsbInterfaceFilter, UsbInterfaceIdentifier } from "./utils.js";
import { findUsbEndpoints, getSerialNumber, isErrorName } from "./utils.js";

/**
 * The default filter for ADB devices, as defined by Google.
 */
export const AdbDefaultInterfaceFilter = {
    classCode: 0xff,
    subclassCode: 0x42,
    protocolCode: 1,
} as const satisfies UsbInterfaceFilter;

export function mergeDefaultAdbInterfaceFilter(
    filters: readonly USBDeviceFilter[] | undefined,
): (USBDeviceFilter & UsbInterfaceFilter)[] {
    if (!filters || filters.length === 0) {
        return [AdbDefaultInterfaceFilter];
    } else {
        return filters.map((filter) => ({
            ...filter,
            classCode: filter.classCode ?? AdbDefaultInterfaceFilter.classCode,
            subclassCode:
                filter.subclassCode ?? AdbDefaultInterfaceFilter.subclassCode,
            protocolCode:
                filter.protocolCode ?? AdbDefaultInterfaceFilter.protocolCode,
        }));
    }
}

export class AdbDaemonWebUsbConnection
    implements ReadableWritablePair<AdbPacketData, Consumable<AdbPacketInit>>
{
    readonly #device: AdbDaemonWebUsbDevice;
    get device() {
        return this.#device;
    }

    readonly #inEndpoint: USBEndpoint;
    get inEndpoint() {
        return this.#inEndpoint;
    }

    readonly #outEndpoint: USBEndpoint;
    get outEndpoint() {
        return this.#outEndpoint;
    }

    readonly #readable: ReadableStream<AdbPacketData>;
    get readable() {
        return this.#readable;
    }

    readonly #writable: WritableStream<Consumable<AdbPacketInit>>;
    get writable() {
        return this.#writable;
    }

    constructor(
        device: AdbDaemonWebUsbDevice,
        inEndpoint: USBEndpoint,
        outEndpoint: USBEndpoint,
        usbManager: USB,
    ) {
        this.#device = device;
        this.#inEndpoint = inEndpoint;
        this.#outEndpoint = outEndpoint;

        let closed = false;

        const duplex = new DuplexStreamFactory<
            AdbPacketData,
            Consumable<Uint8Array>
        >({
            close: async () => {
                try {
                    closed = true;
                    await device.raw.close();
                } catch {
                    /* device may have already disconnected */
                }
            },
            dispose: () => {
                closed = true;
                usbManager.removeEventListener(
                    "disconnect",
                    handleUsbDisconnect,
                );
            },
        });

        function handleUsbDisconnect(e: USBConnectionEvent) {
            if (e.device === device.raw) {
                duplex.dispose().catch(unreachable);
            }
        }

        usbManager.addEventListener("disconnect", handleUsbDisconnect);

        this.#readable = duplex.wrapReadable(
            new ReadableStream<AdbPacketData>(
                {
                    pull: async (controller) => {
                        const packet = await this.#transferIn();
                        if (packet) {
                            controller.enqueue(packet);
                        } else {
                            controller.close();
                        }
                    },
                },
                { highWaterMark: 0 },
            ),
        );

        const zeroMask = outEndpoint.packetSize - 1;
        this.#writable = pipeFrom(
            duplex.createWritable(
                new MaybeConsumable.WritableStream({
                    write: async (chunk) => {
                        try {
                            await device.raw.transferOut(
                                outEndpoint.endpointNumber,
                                toLocalUint8Array(chunk),
                            );

                            // In USB protocol, a not-full packet indicates the end of a transfer.
                            // If the payload size is a multiple of the packet size,
                            // we need to send an empty packet to indicate the end,
                            // so the OS will send it to the device immediately.
                            if (zeroMask && (chunk.length & zeroMask) === 0) {
                                await device.raw.transferOut(
                                    outEndpoint.endpointNumber,
                                    EmptyUint8Array,
                                );
                            }
                        } catch (e) {
                            if (closed) {
                                return;
                            }
                            throw e;
                        }
                    },
                }),
            ),
            new AdbPacketSerializeStream(),
        );
    }

    async #transferIn(): Promise<AdbPacketData | undefined> {
        try {
            while (true) {
                // ADB daemon sends each packet in two parts, the 24-byte header and the payload.
                const result = await this.#device.raw.transferIn(
                    this.#inEndpoint.endpointNumber,
                    this.#inEndpoint.packetSize,
                );

                if (result.data!.byteLength !== 24) {
                    continue;
                }

                // Per spec, the `result.data` always covers the whole `buffer`.
                const buffer = new Uint8Array(result.data!.buffer);
                const stream = new Uint8ArrayExactReadable(buffer);

                // Add `payload` field to its type, it's assigned below.
                const packet = AdbPacketHeader.deserialize(
                    stream,
                ) as AdbPacketHeader & { payload: Uint8Array };

                if (packet.magic !== (packet.command ^ 0xffffffff)) {
                    continue;
                }

                if (packet.payloadLength !== 0) {
                    const result = await this.#device.raw.transferIn(
                        this.#inEndpoint.endpointNumber,
                        packet.payloadLength,
                    );
                    packet.payload = new Uint8Array(result.data!.buffer);
                } else {
                    packet.payload = EmptyUint8Array;
                }

                return packet;
            }
        } catch (e) {
            // On Windows, disconnecting the device will cause `NetworkError` to be thrown,
            // even before the `disconnect` event is fired.
            // Wait a little while and check if the device is still connected.
            // https://github.com/WICG/webusb/issues/219
            if (isErrorName(e, "NetworkError")) {
                await new Promise<void>((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 100);
                });

                if (closed) {
                    return undefined;
                }
            }

            throw e;
        }
    }
}

export class AdbDaemonWebUsbDevice implements AdbDaemonDevice {
    static DeviceBusyError = _DeviceBusyError;

    readonly #interface: UsbInterfaceIdentifier;
    readonly #usbManager: USB;

    readonly #raw: USBDevice;
    get raw() {
        return this.#raw;
    }

    readonly #serial: string;
    get serial(): string {
        return this.#serial;
    }

    get name(): string {
        return this.#raw.productName!;
    }

    /**
     * Create a new instance of `AdbDaemonWebUsbConnection` using a specified `USBDevice` instance
     *
     * @param device The `USBDevice` instance obtained elsewhere.
     * @param filters The filters to use when searching for ADB interface. Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
     */
    constructor(
        device: USBDevice,
        interface_: UsbInterfaceIdentifier,
        usbManager: USB,
    ) {
        this.#raw = device;
        this.#serial = getSerialNumber(device);
        this.#interface = interface_;
        this.#usbManager = usbManager;
    }

    async #claimInterface(): Promise<{
        inEndpoint: USBEndpoint;
        outEndpoint: USBEndpoint;
    }> {
        if (!this.#raw.opened) {
            await this.#raw.open();
        }

        const { configuration, interface_, alternate } = this.#interface;

        if (
            this.#raw.configuration?.configurationValue !==
            configuration.configurationValue
        ) {
            // Note: Switching configuration is not supported on Windows,
            // but Android devices should always expose ADB function at the first (default) configuration.
            await this.#raw.selectConfiguration(
                configuration.configurationValue,
            );
        }

        if (!interface_.claimed) {
            try {
                await this.#raw.claimInterface(interface_.interfaceNumber);
            } catch (e) {
                if (isErrorName(e, "NetworkError")) {
                    throw new AdbDaemonWebUsbDevice.DeviceBusyError(e);
                }

                throw e;
            }
        }

        if (
            interface_.alternate.alternateSetting !== alternate.alternateSetting
        ) {
            await this.#raw.selectAlternateInterface(
                interface_.interfaceNumber,
                alternate.alternateSetting,
            );
        }

        return findUsbEndpoints(alternate.endpoints);
    }

    /**
     * Open the device and create a new connection to the ADB Daemon.
     */
    async connect(): Promise<AdbDaemonWebUsbConnection> {
        const { inEndpoint, outEndpoint } = await this.#claimInterface();
        return new AdbDaemonWebUsbConnection(
            this,
            inEndpoint,
            outEndpoint,
            this.#usbManager,
        );
    }
}

export namespace AdbDaemonWebUsbDevice {
    export type DeviceBusyError = _DeviceBusyError;
}
