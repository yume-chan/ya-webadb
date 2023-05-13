import type { AdbDeviceFilter } from "./connection.js";
import {
    ADB_DEFAULT_DEVICE_FILTER,
    AdbDaemonWebUsbConnection,
} from "./connection.js";

export class AdbDaemonWebUsbConnectionManager {
    /**
     * Gets the instance of {@link AdbDaemonWebUsbConnectionManager} using browser WebUSB implementation.
     *
     * May be `undefined` if current runtime does not support WebUSB.
     */
    public static readonly BROWSER =
        typeof window !== "undefined" && !!window.navigator.usb
            ? new AdbDaemonWebUsbConnectionManager(window.navigator.usb)
            : undefined;

    private _usb: USB;

    /**
     * Create a new instance of {@link AdbDaemonWebUsbConnectionManager} using the specified WebUSB implementation.
     * @param usb A WebUSB compatible interface.
     */
    public constructor(usb: USB) {
        this._usb = usb;
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
     * @returns An {@link AdbDaemonWebUsbConnection} instance if the user selected a device,
     * or `undefined` if the user cancelled the device picker.
     */
    public async requestDevice(
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ): Promise<AdbDaemonWebUsbConnection | undefined> {
        try {
            const device = await this._usb.requestDevice({
                filters,
            });
            return new AdbDaemonWebUsbConnection(device, filters, this._usb);
        } catch (e) {
            // No device selected
            // This check is compatible with both Browser implementation
            // and `usb` NPM package from version 2.8.1
            // https://github.com/node-usb/node-usb/issues/573
            if (
                typeof e === "object" &&
                e !== null &&
                "name" in e &&
                e.name === "NotFoundError"
            ) {
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
     * @returns An array of {@link AdbDaemonWebUsbConnection} instances for all connected and authenticated devices.
     */
    public async getDevices(
        filters: AdbDeviceFilter[] = [ADB_DEFAULT_DEVICE_FILTER]
    ): Promise<AdbDaemonWebUsbConnection[]> {
        const devices = await this._usb.getDevices();
        return devices.map(
            (device) =>
                new AdbDaemonWebUsbConnection(device, filters, this._usb)
        );
    }
}
