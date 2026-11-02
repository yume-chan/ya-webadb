import {
    AdbDaemonWebUsbDevice,
    mergeDefaultAdbInterfaceFilter,
} from "./device.js";
import { AdbDaemonWebUsbDeviceObserver } from "./observer.js";
import { isErrorName, matchFilters } from "./utils.js";

export namespace AdbDaemonWebUsbDeviceManager {
    export interface RequestDeviceOptions {
        filters?: readonly USBDeviceFilter[] | undefined;
        exclusionFilters?: readonly USBDeviceFilter[] | undefined;
    }
}

export class AdbDaemonWebUsbDeviceManager {
    /**
     * Gets the instance of {@link AdbDaemonWebUsbDeviceManager} using browser WebUSB implementation.
     *
     * May be `undefined` if current runtime does not support WebUSB.
     */
    static readonly BROWSER = /* #__PURE__ */ (() =>
        typeof globalThis.navigator !== "undefined" && globalThis.navigator.usb
            ? new AdbDaemonWebUsbDeviceManager(globalThis.navigator.usb)
            : undefined)();

    readonly #usbManager: USB;

    /**
     * Create a new instance of {@link AdbDaemonWebUsbDeviceManager} using the specified WebUSB implementation.
     * @param usbManager A WebUSB compatible interface.
     */
    constructor(usbManager: USB) {
        this.#usbManager = usbManager;
    }

    /**
     * Call `USB#requestDevice()` to prompt the user to select a device.
     */
    async requestDevice(
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ): Promise<AdbDaemonWebUsbDevice | undefined> {
        const filters = mergeDefaultAdbInterfaceFilter(options.filters);

        try {
            const device = await this.#usbManager.requestDevice({
                filters,
                exclusionFilters: options.exclusionFilters as USBDeviceFilter[],
            });

            const interface_ = matchFilters(
                device,
                filters,
                options.exclusionFilters,
            );
            if (!interface_) {
                // `#usbManager` doesn't support `exclusionFilters`,
                // selected device is invalid
                return undefined;
            }

            // If this `requestDevice` adds a new device,
            // Chrome won't fire a `connect` event for it.
            // This will cause device observer to lose track of it,
            // and when the device disconnects, device observer won't fire the disconnect event for it.
            this.#usbManager.dispatchEvent(
                new USBConnectionEvent("connect", { device }),
            );

            return new AdbDaemonWebUsbDevice(
                device,
                interface_,
                this.#usbManager,
            );
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
     */
    async getDevices(
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ): Promise<AdbDaemonWebUsbDevice[]> {
        const filters = mergeDefaultAdbInterfaceFilter(options.filters);

        const devices = await this.#usbManager.getDevices();
        // filter map
        const result: AdbDaemonWebUsbDevice[] = [];
        for (const device of devices) {
            const interface_ = matchFilters(
                device,
                filters,
                options.exclusionFilters,
            );
            if (interface_) {
                result.push(
                    new AdbDaemonWebUsbDevice(
                        device,
                        interface_,
                        this.#usbManager,
                    ),
                );
            }
        }

        return result;
    }

    trackDevices(
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ): Promise<AdbDaemonWebUsbDeviceObserver> {
        return AdbDaemonWebUsbDeviceObserver.create(this.#usbManager, options);
    }
}
