import { ScrcpyOptions1_18 } from "./1_18/index.js";

export class ScrcpyOptions1_20 extends ScrcpyOptions1_18 {
    constructor(init: ScrcpyOptions1_18.Init, version = "1.20") {
        super(init, version);
    }
}

export { ScrcpyOptions1_18Impl as ScrcpyOptions1_20Impl } from "./1_18/index.js";
