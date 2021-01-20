export class AdbWebUsbBackendWatcher {
    private callback: () => void;

    public constructor(callback: () => void) {
        this.callback = callback;

        window.navigator.usb.addEventListener('connect', callback);
        window.navigator.usb.addEventListener('disconnect', callback);
    }

    public dispose(): void {
        window.navigator.usb.removeEventListener('connect', this.callback);
        window.navigator.usb.removeEventListener('disconnect', this.callback);
    }
}
