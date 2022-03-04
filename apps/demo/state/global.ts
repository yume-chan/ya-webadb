import { Adb, AdbBackend, AdbPacketCore } from "@yume-chan/adb";
import { action, makeAutoObservable } from 'mobx';

export class GlobalState {
    backend: AdbBackend | undefined = undefined;

    device: Adb | undefined = undefined;

    errorDialogVisible = false;
    errorDialogMessage = '';

    logVisible = false;
    logs: [string, AdbPacketCore][] = [];

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

    appendLog(direction: string, packet: AdbPacketCore) {
        this.logs.push([direction, packet]);
    }

    clearLog() {
        this.logs = [];
    }
}

export const globalState = new GlobalState();
