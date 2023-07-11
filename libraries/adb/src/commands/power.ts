// cspell: ignore bootloader
// cspell: ignore fastboot
// cspell: ignore keyevent
// cspell: ignore longpress

import { AdbCommandBase } from "./base.js";

export class AdbPower extends AdbCommandBase {
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

    powerOff() {
        return this.adb.subprocess.spawnAndWaitLegacy(["reboot", "-p"]);
    }

    powerButton(longPress = false) {
        return this.adb.subprocess.spawnAndWaitLegacy([
            "input",
            "keyevent",
            longPress ? "--longpress POWER" : "POWER",
        ]);
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
