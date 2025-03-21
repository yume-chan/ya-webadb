// cspell: ignore bootloader
// cspell: ignore fastboot
// cspell: ignore keyevent
// cspell: ignore longpress

import { AdbServiceBase } from "./base.js";

export class AdbPower extends AdbServiceBase {
    reboot(mode = "") {
        return this.adb.createSocketAndWait(`reboot:${mode}`);
    }

    bootloader() {
        return this.reboot("bootloader");
    }

    fastboot() {
        return this.reboot("fastboot");
    }

    recovery() {
        return this.reboot("recovery");
    }

    sideload() {
        return this.reboot("sideload");
    }

    /**
     * Reboot to Qualcomm Emergency Download (EDL) Mode.
     *
     * Only works on some Qualcomm devices.
     */
    qualcommEdlMode() {
        return this.reboot("edl");
    }

    async powerOff(): Promise<string> {
        const result = await this.adb.subprocess.noneProtocol.spawnWaitText([
            "reboot",
            "-p",
        ]);
        return result.stdout;
    }

    async powerButton(longPress = false): Promise<string> {
        const args = ["input", "keyevent"];
        if (longPress) {
            args.push("--longpress");
        }
        args.push("POWER");

        const result =
            await this.adb.subprocess.noneProtocol.spawnWaitText(args);
        return result.stdout;
    }

    /**
     * Reboot to Samsung Odin download mode.
     *
     * Only works on Samsung devices.
     */
    samsungOdin() {
        return this.reboot("download");
    }
}
