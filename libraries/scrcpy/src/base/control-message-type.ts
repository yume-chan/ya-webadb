import * as ScrcpyControlMessageType from "./control-message-type-value.js";

// These IDs change between versions, so always use `options.getControlMessageTypes()`
// biome-ignore lint/suspicious/noRedeclare: TypeScript declaration merging for enum-like object
type ScrcpyControlMessageType =
    (typeof ScrcpyControlMessageType)[keyof typeof ScrcpyControlMessageType];

export { ScrcpyControlMessageType };
