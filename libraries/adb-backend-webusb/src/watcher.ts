export class AdbWebUsbBackendWatcher {
    private _callback: (newDeviceSerial?: string) => void;
    private _usb: USB;

    public constructor(callback: (newDeviceSerial?: string) => void, usb: USB) {
        this._callback = callback;
        this._usb = usb;

        this._usb.addEventListener("connect", this.handleConnect);
        this._usb.addEventListener("disconnect", this.handleDisconnect);
    }

    public dispose(): void {
        this._usb.removeEventListener("connect", this.handleConnect);
        this._usb.removeEventListener("disconnect", this.handleDisconnect);
    }

    private handleConnect = (e: USBConnectionEvent) => {
        this._callback(e.device.serialNumber);
    };

    private handleDisconnect = () => {
        this._callback();
    };
}
