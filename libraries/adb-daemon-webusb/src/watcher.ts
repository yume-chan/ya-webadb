export class AdbDaemonWebUsbDeviceWatcher {
    #callback: (newDeviceSerial?: string) => void;
    #usbManager: USB;

    constructor(callback: (newDeviceSerial?: string) => void, usb: USB) {
        this.#callback = callback;
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
        this.#callback(e.device.serialNumber);
    };

    #handleDisconnect = () => {
        this.#callback();
    };
}
