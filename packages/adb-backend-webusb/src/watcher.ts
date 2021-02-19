export class AdbWebUsbBackendWatcher {
    private callback: (newDeviceSerial?: string) => void;

    public constructor(callback: (newDeviceSerial?: string) => void) {
        this.callback = callback;

        window.navigator.usb.addEventListener('connect', this.handleConnect);
        window.navigator.usb.addEventListener('disconnect', this.handleDisconnect);
    }

    public dispose(): void {
        window.navigator.usb.removeEventListener('connect', this.handleConnect);
        window.navigator.usb.removeEventListener('disconnect', this.handleDisconnect);
    }

    private handleConnect = (e: USBConnectionEvent) => {
        this.callback(e.device.serialNumber);
    };

    private handleDisconnect = () => {
        this.callback();
    };
}
