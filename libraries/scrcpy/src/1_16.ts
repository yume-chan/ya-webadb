import { ScrcpyOptions1_15 } from "./1_15/index.js";

export class ScrcpyOptions1_16 extends ScrcpyOptions1_15 {
    constructor(init: ScrcpyOptions1_15.Init, version = "1.16") {
        super(init, version);
    }
}

export { ScrcpyOptions1_15Impl as ScrcpyOptions1_16Impl } from "./1_15/index.js";
