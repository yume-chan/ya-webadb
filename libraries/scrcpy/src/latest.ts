import { ScrcpyOptions3_2 } from "./3_2/options.js";

export class ScrcpyOptionsLatest<
    TVideo extends boolean,
> extends ScrcpyOptions3_2<TVideo> {
    constructor(init: ScrcpyOptions3_2.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptionsLatest {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_2.Init<TVideo>;
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
} from "./3_2/impl/index.js";
