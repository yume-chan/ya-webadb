import { Adb } from "@yume-chan/adb";
import { makeAutoObservable } from 'mobx';

export class Device {
    current: Adb | undefined;

    constructor() {
        makeAutoObservable(this);
    }

    setCurrent(device: Adb | undefined) {
        this.current = device;
        device?.onDisconnected(() => {
            this.setCurrent(undefined);
        });
    }
}

export const device = new Device();
