import type { ScrcpyOptionValue } from "../../base/option-value.js";

import type { PrevImpl } from "./prev.js";

export const LockOrientation = {
    Unlocked: 0,
    LockedInitial: 1,
    LockedValue: 2,
};

export type LockOrientation =
    (typeof LockOrientation)[keyof typeof LockOrientation];

export const Orientation = {
    Orient0: 0,
    Orient90: 90,
    Orient180: 180,
    Orient270: 270,
};

export type Orientation = (typeof Orientation)[keyof typeof Orientation];

export class CaptureOrientation implements ScrcpyOptionValue {
    static Default = /* #__PURE__ */ new CaptureOrientation(
        LockOrientation.Unlocked,
        Orientation.Orient0,
        false,
    );

    lock: LockOrientation;
    orientation: Orientation;
    flip: boolean;

    constructor(lock: LockOrientation, orientation: Orientation, flip = false) {
        this.lock = lock;
        this.orientation = orientation;
        this.flip = flip;
    }

    toOptionValue(): string | undefined {
        if (
            this.lock === LockOrientation.Unlocked &&
            this.orientation === Orientation.Orient0 &&
            !this.flip
        ) {
            return undefined;
        }

        if (this.lock === LockOrientation.LockedInitial) {
            return "@";
        }

        return (
            (this.lock === LockOrientation.LockedValue ? "@" : "") +
            (this.flip ? "flip" : "") +
            this.orientation
        );
    }
}

export class NewDisplay implements ScrcpyOptionValue {
    static Empty = /* #__PURE__ */ new NewDisplay();

    width?: number | undefined;
    height?: number | undefined;
    dpi?: number | undefined;

    constructor();
    constructor(width: number, height: number);
    constructor(dpi: number);
    constructor(width: number, height: number, dpi: number);
    constructor(a?: number, b?: number, c?: number) {
        if (a === undefined) {
            return;
        }

        if (b === undefined) {
            this.dpi = a;
            return;
        }

        this.width = a;
        this.height = b;
        this.dpi = c;
    }

    toOptionValue() {
        if (
            this.width === undefined &&
            this.height === undefined &&
            this.dpi === undefined
        ) {
            return undefined;
        }

        if (this.width === undefined) {
            return `/${this.dpi}`;
        }

        if (this.dpi === undefined) {
            return `${this.width}x${this.height}`;
        }

        return `${this.width}x${this.height}/${this.dpi}`;
    }
}

export interface Init extends Omit<PrevImpl.Init, "lockVideoOrientation"> {
    captureOrientation?: CaptureOrientation;
    angle?: number;
    screenOffTimeout?: number | undefined;

    listApps?: boolean;

    newDisplay?: NewDisplay;
    vdSystemDecorations?: boolean;
}
