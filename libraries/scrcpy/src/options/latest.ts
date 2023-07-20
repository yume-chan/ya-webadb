import { ScrcpyLogLevel1_18, ScrcpyVideoOrientation1_18 } from "./1_18.js";
import type { ScrcpyOptionsInit2_1 } from "./2_1.js";
import { ScrcpyOptions2_1 } from "./2_1.js";

export const ScrcpyLogLevel = ScrcpyLogLevel1_18;
export type ScrcpyLogLevel = ScrcpyLogLevel1_18;

export const ScrcpyVideoOrientation = ScrcpyVideoOrientation1_18;
export type ScrcpyVideoOrientation = ScrcpyVideoOrientation1_18;

export type ScrcpyOptionsInitLatest = ScrcpyOptionsInit2_1;
export class ScrcpyOptionsLatest extends ScrcpyOptions2_1 {}
