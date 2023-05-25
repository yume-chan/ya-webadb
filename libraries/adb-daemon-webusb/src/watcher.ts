export class AdbDaemonWebUsbDeviceWatcher {
    #callback: (newDeviceSerial?: string) => void;
    #usbManager: USB;

    public constructor(callback: (newDeviceSerial?: string) => void, usb: USB) {
        this.#callback = callback;
        this.#usbManager = usb;

        this.#usbManager.addEventListener("connect", this.handleConnect);
        this.#usbManager.addEventListener("disconnect", this.handleDisconnect);
    }

    public dispose(): void {
        this.#usbManager.removeEventListener("connect", this.handleConnect);
        this.#usbManager.removeEventListener(
            "disconnect",
            this.handleDisconnect
        );
    }

    private handleConnect = (e: USBConnectionEvent) => {
        this.#callback(e.device.serialNumber);
    };

    private handleDisconnect = () => {
        this.#callback();
    };
}
