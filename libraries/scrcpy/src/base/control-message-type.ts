import * as ScrcpyControlMessageType from "./control-message-type-value.js";

// These IDs change between versions, so always use `options.getControlMessageTypes()`
type ScrcpyControlMessageType =
    (typeof ScrcpyControlMessageType)[keyof typeof ScrcpyControlMessageType];

export { ScrcpyControlMessageType };
