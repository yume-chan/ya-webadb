import { ScrcpyLogLevel1_18, ScrcpyVideoOrientation1_18 } from "./1_18.js";
import type { ScrcpyOptionsInit2_2 } from "./2_2.js";
import { ScrcpyOptions2_2 } from "./2_2.js";

export const ScrcpyLogLevel = ScrcpyLogLevel1_18;
export type ScrcpyLogLevel = ScrcpyLogLevel1_18;

export const ScrcpyVideoOrientation = ScrcpyVideoOrientation1_18;
export type ScrcpyVideoOrientation = ScrcpyVideoOrientation1_18;

export type ScrcpyOptionsInitLatest = ScrcpyOptionsInit2_2;
export class ScrcpyOptionsLatest extends ScrcpyOptions2_2 {}
