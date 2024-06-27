import { AdbDaemonWebUsbDevice, toAdbDeviceFilters } from "./device.js";
import {
    findUsbAlternateInterface,
    getSerialNumber,
    isErrorName,
} from "./utils.js";

export namespace AdbDaemonWebUsbDeviceManager {
    export interface RequestDeviceOptions {
        filters?: USBDeviceFilter[] | undefined;
        exclusionFilters?: USBDeviceFilter[] | undefined;
    }
}

export class AdbDaemonWebUsbDeviceManager {
    /**
     * Gets the instance of {@link AdbDaemonWebUsbDeviceManager} using browser WebUSB implementation.
     *
     * May be `undefined` if current runtime does not support WebUSB.
     */
    static readonly BROWSER =
        typeof globalThis.navigator !== "undefined" &&
        !!globalThis.navigator.usb
            ? new AdbDaemonWebUsbDeviceManager(globalThis.navigator.usb)
            : undefined;

    #usbManager: USB;

    /**
     * Create a new instance of {@link AdbDaemonWebUsbDeviceManager} using the specified WebUSB implementation.
     * @param usbManager A WebUSB compatible interface.
     */
    constructor(usbManager: USB) {
        this.#usbManager = usbManager;
    }

    /**
     * Request access to a connected device.
     * This is a convince method for `usb.requestDevice()`.
     * @param filters
     * The filters to apply to the device list.
     *
     * It must have `classCode`, `subclassCode` and `protocolCode` fields for selecting the ADB interface,
     * but might also have `vendorId`, `productId` or `serialNumber` fields to limit the displayed device list.
     *
     * Defaults to {@link ADB_DEFAULT_INTERFACE_FILTER}.
     * @returns An {@link AdbDaemonWebUsbDevice} instance if the user selected a device,
     * or `undefined` if the user cancelled the device picker.
     */
    async requestDevice(
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ): Promise<AdbDaemonWebUsbDevice | undefined> {
        const filters = toAdbDeviceFilters(options.filters);

        try {
            const device = await this.#usbManager.requestDevice({
                filters,
                exclusionFilters: options.exclusionFilters,
            });
            return new AdbDaemonWebUsbDevice(device, filters, this.#usbManager);
        } catch (e) {
            // No device selected
            if (isErrorName(e, "NotFoundError")) {
                return undefined;
            }

            throw e;
        }
    }

    /**
     * Get all connected and authenticated devices.
     * This is a convince method for `usb.getDevices()`.
     * @param filters
     * The filters to apply to the device list.
     *
     * It must have `classCode`, `subclassCode` and `protocolCode` fields for selecting the ADB interface,
     * but might also have `vendorId`, `productId` or `serialNumber` fields to limit the device list.
     *
     * Defaults to {@link ADB_DEFAULT_INTERFACE_FILTER}.
     * @returns An array of {@link AdbDaemonWebUsbDevice} instances for all connected and authenticated devices.
     */
    getDevices(
        filters?: USBDeviceFilter[] | undefined,
    ): Promise<AdbDaemonWebUsbDevice[]>;
    async getDevices(
        filters_: USBDeviceFilter[] | undefined,
    ): Promise<AdbDaemonWebUsbDevice[]> {
        const filters = toAdbDeviceFilters(filters_);

        const devices = await this.#usbManager.getDevices();
        return devices
            .filter((device) => {
                for (const filter of filters) {
                    if (
                        filter.vendorId !== undefined &&
                        device.vendorId !== filter.vendorId
                    ) {
                        continue;
                    }
                    if (
                        filter.productId !== undefined &&
                        device.productId !== filter.productId
                    ) {
                        continue;
                    }
                    if (
                        filter.serialNumber !== undefined &&
                        getSerialNumber(device) !== filter.serialNumber
                    ) {
                        continue;
                    }

                    try {
                        findUsbAlternateInterface(device, filters);
                        return true;
                    } catch {
                        continue;
                    }
                }
                return false;
            })
            .map(
                (device) =>
                    new AdbDaemonWebUsbDevice(
                        device,
                        filters,
                        this.#usbManager,
                    ),
            );
    }
}
