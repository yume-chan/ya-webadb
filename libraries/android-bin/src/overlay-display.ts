import type { Adb } from "@yume-chan/adb";
import { AdbCommandBase } from "@yume-chan/adb";

import { Settings } from "./settings.js";

export interface OverlayDisplayDeviceMode {
    width: number;
    height: number;
    density: number;
}

export interface OverlayDisplayDevice {
    modes: OverlayDisplayDeviceMode[];
    secure: boolean;
    ownContentOnly: boolean;
    showSystemDecorations: boolean;
}

export class OverlayDisplay extends AdbCommandBase {
    private settings: Settings;

    public static readonly OVERLAY_DISPLAY_DEVICES_KEY =
        "overlay_display_devices";

    constructor(adb: Adb) {
        super(adb);
        this.settings = new Settings(adb);
    }

    public async get() {
        const devices: OverlayDisplayDevice[] = [];

        const settingString = await this.settings.get(
            "global",
            OverlayDisplay.OVERLAY_DISPLAY_DEVICES_KEY
        );

        for (const displayString of settingString.split(";")) {
            const [modesString, ...flagStrings] = displayString.split(",");

            if (!modesString) {
                continue;
            }

            const device: OverlayDisplayDevice = {
                modes: [],
                secure: false,
                ownContentOnly: false,
                showSystemDecorations: false,
            };
            for (const modeString of modesString.split("|")) {
                const match = modeString.match(/(\d+)x(\d+)\/(\d+)/);
                if (!match) {
                    continue;
                }
                device.modes.push({
                    width: parseInt(match[1]!, 10),
                    height: parseInt(match[2]!, 10),
                    density: parseInt(match[3]!, 10),
                });
            }
            if (device.modes.length === 0) {
                continue;
            }

            for (const flagString of flagStrings) {
                switch (flagString) {
                    case "secure":
                        device.secure = true;
                        break;
                    case "own_content_only":
                        device.ownContentOnly = true;
                        break;
                    case "show_system_decorations":
                        device.showSystemDecorations = true;
                        break;
                }
            }
            devices.push(device);
        }

        return devices;
    }

    public async set(devices: OverlayDisplayDevice[]) {
        let settingString = "";
        for (const device of devices) {
            if (settingString) {
                settingString += ";";
            }

            settingString += device.modes
                .map((mode) => `${mode.width}x${mode.height}/${mode.density}`)
                .join("|");

            if (device.secure) {
                settingString += ",secure";
            }

            if (device.ownContentOnly) {
                settingString += ",own_content_only";
            }

            if (device.showSystemDecorations) {
                settingString += ",show_system_decorations";
            }
        }

        await this.settings.put(
            "global",
            OverlayDisplay.OVERLAY_DISPLAY_DEVICES_KEY,
            settingString
        );
    }
}
