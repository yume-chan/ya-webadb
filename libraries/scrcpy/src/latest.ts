import { ScrcpyOptions3_3_1 } from "./3_3_1/index.js";

export class ScrcpyOptionsLatest<
    TVideo extends boolean,
> extends ScrcpyOptions3_3_1<TVideo> {
    constructor(init: ScrcpyOptions3_3_1.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptionsLatest {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_3_1.Init<TVideo>;
}

export {
    BackOrScreenOnControlMessage as ScrcpyBackOrScreenOnControlMessage,
    CaptureOrientation as ScrcpyCaptureOrientation,
    CodecOptions as ScrcpyCodecOptions,
    Crop as ScrcpyCrop,
    InjectScrollControlMessage as ScrcpyInjectScrollControlMessage,
    InjectTouchControlMessage as ScrcpyInjectTouchControlMessage,
    InstanceId as ScrcpyInstanceId,
    LockOrientation as ScrcpyLockOrientation,
    NewDisplay as ScrcpyNewDisplay,
    Orientation as ScrcpyOrientation,
    PointerId as ScrcpyPointerId,
    SetClipboardControlMessage as ScrcpySetClipboardControlMessage,
    UHidCreateControlMessage as ScrcpyUHidCreateControlMessage,
    UHidOutputDeviceMessage as ScrcpyUHidOutputDeviceMessage,
} from "./3_3_1/impl/index.js";
