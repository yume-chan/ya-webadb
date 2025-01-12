import type { DeviceObserver } from "@yume-chan/adb";
import { EventEmitter } from "@yume-chan/event";

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

    #filters: (USBDeviceFilter & UsbInterfaceFilter)[];
    #exclusionFilters?: USBDeviceFilter[] | undefined;
    #usbManager: USB;

    #onDeviceAdd = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    onDeviceAdd = this.#onDeviceAdd.event;

    #onDeviceRemove = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    onDeviceRemove = this.#onDeviceRemove.event;

    #onListChange = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    onListChange = this.#onListChange.event;

    current: AdbDaemonWebUsbDevice[] = [];

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

        this.#onDeviceAdd.fire([device]);
        this.current.push(device);
        this.#onListChange.fire(this.current);
    };

    #handleDisconnect = (e: USBConnectionEvent) => {
        const index = this.current.findIndex(
            (device) => device.raw === e.device,
        );
        if (index !== -1) {
            const device = this.current[index]!;
            this.#onDeviceRemove.fire([device]);
            this.current[index] = this.current[this.current.length - 1]!;
            this.current.length -= 1;
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
