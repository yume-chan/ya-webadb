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
    #filters: (USBDeviceFilter & UsbInterfaceFilter)[];
    #exclusionFilters?: USBDeviceFilter[] | undefined;
    #usbManager: USB;

    #onError = new EventEmitter<Error>();
    onError = this.#onError.event;

    #onDeviceAdd = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    onDeviceAdd = this.#onDeviceAdd.event;

    #onDeviceRemove = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    onDeviceRemove = this.#onDeviceRemove.event;

    #onListChange = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    onListChange = this.#onListChange.event;

    current: AdbDaemonWebUsbDevice[] = [];

    constructor(
        usb: USB,
        options: AdbDaemonWebUsbDeviceManager.RequestDeviceOptions = {},
    ) {
        this.#filters = mergeDefaultAdbInterfaceFilter(options.filters);
        this.#exclusionFilters = options.exclusionFilters;
        this.#usbManager = usb;

        this.#usbManager.addEventListener("connect", this.#handleConnect);
        this.#usbManager.addEventListener("disconnect", this.#handleDisconnect);
    }

    #handleConnect = (e: USBConnectionEvent) => {
        const interface_ = matchFilters(
            e.device,
            this.#filters,
            this.#exclusionFilters,
        );
        if (!interface_) {
            return;
        }

        const device = new AdbDaemonWebUsbDevice(
            e.device,
            interface_,
            this.#usbManager,
        );
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

        this.#onError.dispose();
        this.#onDeviceAdd.dispose();
        this.#onDeviceRemove.dispose();
        this.#onListChange.dispose();
    }
}
