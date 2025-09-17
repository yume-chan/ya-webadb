import type { DeviceObserver } from "@yume-chan/adb";
import { unorderedRemove } from "@yume-chan/adb";
import { EventEmitter, StickyEventEmitter } from "@yume-chan/event";

import {
    AdbDaemonWebUsbDevice,
    mergeDefaultAdbInterfaceFilter,
} from "./device.js";
import type { AdbDaemonWebUsbDeviceManager } from "./manager.js";
import type { UsbInterfaceFilter } from "./utils.js";
import { matchFilters } from "./utils.js";

/**
 * A watcher that listens for new WebUSB devices and notifies the callback when
 * a new device is connected or disconnected.
 */
export class AdbDaemonWebUsbDeviceObserver
    implements DeviceObserver<AdbDaemonWebUsbDevice>
{
    static async create(
        usb: USB,
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ) {
        const devices = await usb.getDevices();
        return new AdbDaemonWebUsbDeviceObserver(usb, devices, options);
    }

    readonly #filters: readonly (USBDeviceFilter & UsbInterfaceFilter)[];
    readonly #exclusionFilters?: readonly USBDeviceFilter[] | undefined;
    readonly #usbManager: USB;

    readonly #onDeviceAdd = new EventEmitter<
        readonly AdbDaemonWebUsbDevice[]
    >();
    onDeviceAdd = this.#onDeviceAdd.event;

    readonly #onDeviceRemove = new EventEmitter<
        readonly AdbDaemonWebUsbDevice[]
    >();
    onDeviceRemove = this.#onDeviceRemove.event;

    readonly #onListChange = new StickyEventEmitter<
        readonly AdbDaemonWebUsbDevice[]
    >();
    onListChange = this.#onListChange.event;

    current: readonly AdbDaemonWebUsbDevice[] = [];

    constructor(
        usb: USB,
        initial: USBDevice[],
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ) {
        this.#filters = mergeDefaultAdbInterfaceFilter(options.filters);
        this.#exclusionFilters = options.exclusionFilters;
        this.#usbManager = usb;

        this.current = initial
            .map((device) => this.#convertDevice(device))
            .filter((device) => !!device);
        // Fire `onListChange` to set the sticky value
        this.#onListChange.fire(this.current);

        this.#usbManager.addEventListener("connect", this.#handleConnect);
        this.#usbManager.addEventListener("disconnect", this.#handleDisconnect);
    }

    #convertDevice(device: USBDevice): AdbDaemonWebUsbDevice | undefined {
        const interface_ = matchFilters(
            device,
            this.#filters,
            this.#exclusionFilters,
        );
        if (!interface_) {
            return undefined;
        }

        return new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager);
    }

    #handleConnect = (e: USBConnectionEvent) => {
        const device = this.#convertDevice(e.device);
        if (!device) {
            return;
        }

        // We send a `connect` event on `requestDevice` success,
        // but this device might already exist if we already have the permission for it.
        if (this.current.some((item) => item.raw === device.raw)) {
            return;
        }

        const next = this.current.slice();
        next.push(device);
        this.current = next;

        this.#onDeviceAdd.fire([device]);
        this.#onListChange.fire(this.current);
    };

    #handleDisconnect = (e: USBConnectionEvent) => {
        const index = this.current.findIndex(
            (device) => device.raw === e.device,
        );
        if (index !== -1) {
            const device = this.current[index]!;

            const next = this.current.slice();
            unorderedRemove(next, index);
            this.current = next;

            this.#onDeviceRemove.fire([device]);
            this.#onListChange.fire(this.current);
        }
    };

    stop(): void {
        this.#usbManager.removeEventListener("connect", this.#handleConnect);
        this.#usbManager.removeEventListener(
            "disconnect",
            this.#handleDisconnect,
        );

        this.#onDeviceAdd.dispose();
        this.#onDeviceRemove.dispose();
        this.#onListChange.dispose();
    }
}
