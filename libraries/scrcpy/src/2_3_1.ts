import { ScrcpyOptions2_3 } from "./2_3/index.js";

export class ScrcpyOptions2_3_1 extends ScrcpyOptions2_3 {
    constructor(init: ScrcpyOptions2_3.Init, version = "2.3.1") {
        super(init, version);
    }
}

export { ScrcpyOptions2_3Impl as ScrcpyOptions2_3_1Impl } from "./2_3/index.js";
