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

/**
 * [Online Documentation](https://docs.tangoapp.dev/tango/daemon/usb/device-manager/)
 */
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
     * Call `USB#requestDevice()` to prompt the user to select a device.
     *
     * [Online Documentation](https://docs.tangoapp.dev/tango/daemon/usb/request-device/)
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
     * Get all connected and requested devices that match the specified filters.
     *
     * [Online Documentation](https://docs.tangoapp.dev/tango/daemon/usb/get-devices/)
     */
    getDevices(filters?: USBDeviceFilter[]): Promise<AdbDaemonWebUsbDevice[]>;
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
