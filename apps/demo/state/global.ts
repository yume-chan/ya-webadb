import { Adb } from "@yume-chan/adb";
import { makeAutoObservable } from 'mobx';

export class GlobalState {
    device: Adb | undefined;

    constructor() {
        makeAutoObservable(this);
    }

    setCurrent(device: Adb | undefined) {
        this.device = device;
        device?.onDisconnected(() => {
            this.setCurrent(undefined);
        });
    }
}

export const global = new GlobalState();
