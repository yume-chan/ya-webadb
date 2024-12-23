import { ScrcpyOptions1_15 } from "./1_15/index.js";

export class ScrcpyOptions1_15_1 extends ScrcpyOptions1_15 {
    constructor(init: ScrcpyOptions1_15.Init, version = "1.15.1") {
        super(init, version);
    }
}

export { ScrcpyOptions1_15Impl as ScrcpyOptions1_15_1Impl } from "./1_15/index.js";
