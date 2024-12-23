import { ScrcpyOptions3_1 } from "./3_1/options.js";

export class ScrcpyOptionsLatest extends ScrcpyOptions3_1 {
    constructor(init: ScrcpyOptions3_1.Init, version: string) {
        super(init, version);
    }
}

export { ScrcpyOptions3_1Impl as ScrcpyOptionsLatestImpl } from "./3_1/index.js";

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
} from "./3_1/impl/index.js";
