import { Adb, AdbDaemonDevice, AdbPacketData } from "@yume-chan/adb";
import { action, makeAutoObservable, observable } from "mobx";

export type PacketLogItemDirection = "in" | "out";

export interface PacketLogItem extends AdbPacketData {
    direction: PacketLogItemDirection;

    timestamp?: Date;
    commandString?: string;
    arg0String?: string;
    arg1String?: string;
    payloadString?: string;
}

export class GlobalState {
    device: AdbDaemonDevice | undefined = undefined;
    adb: Adb | undefined = undefined;

    errorDialogVisible = false;
    errorDialogMessage = "";

    logs: PacketLogItem[] = [];

    constructor() {
        makeAutoObservable(this, {
            hideErrorDialog: action.bound,
            logs: observable.shallow,
        });
    }

    setDevice(device: AdbDaemonDevice | undefined, adb: Adb | undefined) {
        this.device = device;
        this.adb = adb;
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
        this.logs.push({
            ...packet,
            direction,
            timestamp: new Date(),
            payload: packet.payload.slice(),
        } as PacketLogItem);
    }

    clearLog() {
        this.logs.length = 0;
    }
}

export const GLOBAL_STATE = new GlobalState();
