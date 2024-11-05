import type { DeviceObserver } from "@yume-chan/adb";
import { EventEmitter } from "@yume-chan/event";

import { AdbDaemonWebUsbDevice, toAdbDeviceFilters } from "./device.js";
import type { UsbInterfaceFilter } from "./utils.js";
import { matchesFilters } from "./utils.js";

/**
 * A watcher that listens for new WebUSB devices and notifies the callback when
 * a new device is connected or disconnected.
 *
 * [Online Documentation](https://docs.tangoapp.dev/tango/daemon/usb/watch-devices/)
 */
export class AdbDaemonWebUsbDeviceObserver
    implements DeviceObserver<AdbDaemonWebUsbDevice>
{
    #filters: UsbInterfaceFilter[];
    #usbManager: USB;

    #deviceAdded = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    deviceAdded = this.#deviceAdded.event;

    #deviceRemoved = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    deviceRemoved = this.#deviceRemoved.event;

    #deviceChanged = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    deviceChanged = this.#deviceChanged.event;

    #listChanged = new EventEmitter<AdbDaemonWebUsbDevice[]>();
    listChanged = this.#listChanged.event;

    current: AdbDaemonWebUsbDevice[] = [];

    constructor(usb: USB, filters?: USBDeviceFilter[]) {
        this.#filters = toAdbDeviceFilters(filters);
        this.#usbManager = usb;

        this.#usbManager.addEventListener("connect", this.#handleConnect);
        this.#usbManager.addEventListener("disconnect", this.#handleDisconnect);
    }

    dispose(): void {
        this.#usbManager.removeEventListener("connect", this.#handleConnect);
        this.#usbManager.removeEventListener(
            "disconnect",
            this.#handleDisconnect,
        );
    }

    #handleConnect = (e: USBConnectionEvent) => {
        if (!matchesFilters(e.device, this.#filters)) {
            return;
        }

        const device = new AdbDaemonWebUsbDevice(
            e.device,
            this.#filters,
            this.#usbManager,
        );
        this.#deviceAdded.fire([device]);
        this.current.push(device);
        this.#listChanged.fire(this.current);
    };

    #handleDisconnect = (e: USBConnectionEvent) => {
        const index = this.current.findIndex(
            (device) => device.raw === e.device,
        );
        if (index !== -1) {
            const device = this.current[index]!;
            this.#deviceRemoved.fire([device]);
            this.current[index] = this.current[this.current.length - 1]!;
            this.current.length -= 1;
            this.#listChanged.fire(this.current);
        }
    };

    stop(): void {
        this.#usbManager.removeEventListener("connect", this.#handleConnect);
        this.#usbManager.removeEventListener(
            "disconnect",
            this.#handleDisconnect,
        );
    }
}
