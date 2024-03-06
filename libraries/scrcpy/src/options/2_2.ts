import { ScrcpyOptions1_21 } from "./1_21.js";
import type { ScrcpyOptionsInit2_1 } from "./2_1.js";
import { ScrcpyOptions2_1 } from "./2_1.js";
import type { ScrcpyDisplay } from "./types.js";
import { ScrcpyOptionsBase } from "./types.js";

export interface ScrcpyOptionsInit2_2
    extends Omit<ScrcpyOptionsInit2_1, "display"> {
    videoSource?: "display" | "camera";
    displayId?: number;
    cameraId?: string | undefined;
    cameraSize?: string | undefined;
    cameraFacing?: "front" | "back" | "external" | undefined;
    cameraAr?: string | undefined;
    cameraFps?: number | undefined;
    cameraHighSpeed?: boolean;

    listCameras?: boolean;
    listCameraSizes?: boolean;
}

export class ScrcpyOptions2_2 extends ScrcpyOptionsBase<
    ScrcpyOptionsInit2_2,
    ScrcpyOptions2_1
> {
    static readonly DEFAULTS = {
        ...ScrcpyOptions2_1.DEFAULTS,
        videoSource: "display",
        displayId: 0,
        cameraId: undefined,
        cameraSize: undefined,
        cameraFacing: undefined,
        cameraAr: undefined,
        cameraFps: undefined,
        cameraHighSpeed: false,
        listCameras: false,
        listCameraSizes: false,
    } as const satisfies Required<ScrcpyOptionsInit2_2>;

    override get defaults(): Required<ScrcpyOptionsInit2_2> {
        return ScrcpyOptions2_2.DEFAULTS;
    }

    constructor(init: ScrcpyOptionsInit2_2) {
        super(new ScrcpyOptions2_1(init), {
            ...ScrcpyOptions2_2.DEFAULTS,
            ...init,
        });
    }

    override parseDisplay(line: string): ScrcpyDisplay | undefined {
        const match = line.match(/^\s+--display-id=(\d+)\s+\(([^)]+)\)$/);
        if (match) {
            const display: ScrcpyDisplay = {
                id: Number.parseInt(match[1]!, 10),
            };
            if (match[2] !== "size unknown") {
                display.resolution = match[2]!;
            }
            return display;
        }
        return undefined;
    }

    override serialize(): string[] {
        return ScrcpyOptions1_21.serialize(this.value, this.defaults);
    }
}
