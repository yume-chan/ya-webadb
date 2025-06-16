import type { Adb } from "@yume-chan/adb";
import { AdbServiceBase } from "@yume-chan/adb";

import { Settings } from "./settings.js";
import { p } from "./string-format.js";

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

export class OverlayDisplay extends AdbServiceBase {
    #settings: Settings;

    static readonly SETTING_KEY = "overlay_display_devices";

    static readonly SETTING_FORMAT = p.separated(
        ";",
        p.sequence(
            {
                name: "modes",
                format: p.separated(
                    "|",
                    p.sequence(
                        { name: "width", format: p.digits() },
                        p.literal("x"),
                        { name: "height", format: p.digits() },
                        p.literal("/"),
                        { name: "density", format: p.digits() },
                    ),
                    { min: 1 },
                ),
            },
            {
                name: "flags",
                format: p.map(
                    p.repeated(
                        p.sequence(p.literal(","), {
                            name: "flag",
                            format: p.union(
                                p.literal("secure"),
                                p.literal("own_content_only"),
                                p.literal("show_system_decorations"),
                            ),
                        }),
                    ),
                    (value) => value.map((item) => item.flag),
                    (value) => value.map((item) => ({ flag: item })),
                ),
            },
        ),
    );

    constructor(adb: Adb) {
        super(adb);
        this.#settings = new Settings(adb);
    }

    async get() {
        return OverlayDisplay.SETTING_FORMAT.parse({
            value: await this.#settings.get(
                "global",
                OverlayDisplay.SETTING_KEY,
            ),
            position: 0,
        }).map((device) => ({
            modes: device.modes,
            secure: device.flags.includes("secure"),
            ownContentOnly: device.flags.includes("own_content_only"),
            showSystemDecorations: device.flags.includes(
                "show_system_decorations",
            ),
        }));
    }

    async set(devices: readonly OverlayDisplayDevice[]): Promise<void> {
        await this.#settings.put(
            "global",
            OverlayDisplay.SETTING_KEY,
            OverlayDisplay.SETTING_FORMAT.stringify(
                devices.map((device) => {
                    const flags: (
                        | "secure"
                        | "own_content_only"
                        | "show_system_decorations"
                    )[] = [];
                    if (device.secure) {
                        flags.push("secure");
                    }
                    if (device.ownContentOnly) {
                        flags.push("own_content_only");
                    }
                    if (device.showSystemDecorations) {
                        flags.push("show_system_decorations");
                    }
                    return {
                        modes: device.modes,
                        flags,
                    };
                }),
            ),
        );
    }
}
