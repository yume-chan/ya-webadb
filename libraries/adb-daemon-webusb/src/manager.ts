import { ADB_DEFAULT_DEVICE_FILTER, AdbDaemonWebUsbDevice } from "./device.js";
import type { AdbDeviceFilter } from "./utils.js";
import { findUsbAlternateInterface, isErrorName } from "./utils.js";

export class AdbDaemonWebUsbDeviceManager {
    /**
     * Gets the instance of {@link AdbDaemonWebUsbDeviceManager} using browser WebUSB implementation.
     *
     * May be `undefined` if current runtime does not support WebUSB.
     */
    public static readonly BROWSER =
        typeof globalThis.navigator !== "undefined" &&
        !!globalThis.navigator.usb
            ? new AdbDaemonWebUsbDeviceManager(globalThis.navigator.usb)
            : undefined;

    #usbManager: USB;

    /**
     * Create a new instance of {@link AdbDaemonWebUsbDeviceManager} using the specified WebUSB implementation.
     * @param usbManager A WebUSB compatible interface.
     */
    public constructor(usbManager: USB) {
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
     * Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
     * @returns An {@link AdbDaemonWebUsbDevice} instance if the user selected a device,
     * or `undefined` if the user cancelled the device picker.
     */
    public async requestDevice(
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ): Promise<AdbDaemonWebUsbDevice | undefined> {
        try {
            const device = await this.#usbManager.requestDevice({
                filters,
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
     * Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
     * @returns An array of {@link AdbDaemonWebUsbDevice} instances for all connected and authenticated devices.
     */
    public async getDevices(
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ): Promise<AdbDaemonWebUsbDevice[]> {
        const devices = await this.#usbManager.getDevices();
        return devices
            .filter((device) => {
                for (const filter of filters) {
                    if (
                        "vendorId" in filter &&
                        device.vendorId !== filter.vendorId
                    ) {
                        continue;
                    }
                    if (
                        "productId" in filter &&
                        device.productId !== filter.productId
                    ) {
                        continue;
                    }
                    if (
                        "serialNumber" in filter &&
                        device.serialNumber !== filter.serialNumber
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
                    new AdbDaemonWebUsbDevice(device, filters, this.#usbManager)
            );
    }
}
