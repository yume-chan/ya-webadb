// cspell: ignore bootloader
// cspell: ignore fastboot
// cspell: ignore keyevent
// cspell: ignore longpress

import { AdbCommandBase } from "./base.js";

export class AdbPower extends AdbCommandBase {
    public reboot(name = "") {
        return this.adb.createSocketAndWait(`reboot:${name}`);
    }

    public bootloader() {
        return this.reboot("bootloader");
    }

    public fastboot() {
        return this.reboot("fastboot");
    }

    public recovery() {
        return this.reboot("recovery");
    }

    public sideload() {
        return this.reboot("sideload");
    }

    /**
     * Reboot to Qualcomm Emergency Download (EDL) Mode.
     *
     * Only works on some Qualcomm devices.
     */
    public qualcommEdlMode() {
        return this.reboot("edl");
    }

    public powerOff() {
        return this.adb.subprocess.spawnAndWaitLegacy(["reboot", "-p"]);
    }

    public powerButton(longPress = false) {
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
    public samsungOdin() {
        return this.reboot("download");
    }
}
