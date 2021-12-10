import { Adb } from "@yume-chan/adb";
import { action, makeAutoObservable } from 'mobx';

export class GlobalState {
    device: Adb | undefined = undefined;
    errorDialogVisible = false;
    errorDialogMessage = '';

    logVisible = false;

    constructor() {
        makeAutoObservable(this, {
            hideErrorDialog: action.bound,
            toggleLog: action.bound,
        });
    }

    setDevice(device: Adb | undefined) {
        this.device = device;
        device?.onDisconnected(() => {
            this.setDevice(undefined);
        });
    }

    showErrorDialog(message: string) {
        this.errorDialogVisible = true;
        this.errorDialogMessage = message;
    }

    hideErrorDialog() {
        this.errorDialogVisible = false;
    }

    toggleLog() {
        this.logVisible = !this.logVisible;
    }
}

export const global = new GlobalState();
