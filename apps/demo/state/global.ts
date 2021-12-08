import { Adb } from "@yume-chan/adb";
import { action, makeAutoObservable } from 'mobx';

export class GlobalState {
    device: Adb | undefined;
    errorDialogVisible = false;
    errorDialogMessage = '';

    constructor() {
        makeAutoObservable(this, {
            hideErrorDialog: action.bound,
        });
    }

    setCurrent(device: Adb | undefined) {
        this.device = device;
        device?.onDisconnected(() => {
            this.setCurrent(undefined);
        });
    }

    showErrorDialog(message: string) {
        this.errorDialogVisible = true;
        this.errorDialogMessage = message;
    }

    hideErrorDialog() {
        this.errorDialogVisible = false;
    }
}

export const global = new GlobalState();
