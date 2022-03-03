import { Adb, AdbBackend } from "@yume-chan/adb";
import { action, makeAutoObservable } from 'mobx';

export class GlobalState {
    backend: AdbBackend | undefined = undefined;

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

    setDevice(backend: AdbBackend | undefined, device: Adb | undefined) {
        this.backend = backend;
        this.device = device;
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

export const globalState = new GlobalState();
