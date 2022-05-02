import { Adb, AdbBackend, AdbPacketData } from "@yume-chan/adb";
import { action, makeAutoObservable, observable } from 'mobx';

export type PacketLogItemDirection = 'in' | 'out';

export interface PacketLogItem extends AdbPacketData {
    direction: PacketLogItemDirection;

    commandString?: string;
    arg0String?: string;
    arg1String?: string;
    payloadString?: string;
}

export class GlobalStateType {
    backend: AdbBackend | undefined = undefined;
    device: Adb | undefined = undefined;

    errorDialogVisible = false;
    errorDialogMessage = '';

    logs: PacketLogItem[] = [];

    constructor() {
        makeAutoObservable(this, {
            hideErrorDialog: action.bound,
            logs: observable.shallow,
        });
    }

    setDevice(backend: AdbBackend | undefined, device: Adb | undefined) {
        this.backend = backend;
        this.device = device;
    }

    showErrorDialog(message: Error | string) {
        this.errorDialogVisible = true;
        if (message instanceof Error) {
            this.errorDialogMessage = message.stack || message.message;
        } else {
            this.errorDialogMessage = message;
        }
    }

    hideErrorDialog() {
        this.errorDialogVisible = false;
    }

    appendLog(direction: PacketLogItemDirection, packet: AdbPacketData) {
        (packet as PacketLogItem).direction = direction;
        this.logs.push((packet as PacketLogItem));
    }

    clearLog() {
        this.logs = [];
    }
}

export const GlobalState = new GlobalStateType();
