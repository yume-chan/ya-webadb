import { ScrcpyOptions2_1 } from "./2_1/index.js";

export class ScrcpyOptions2_1_1 extends ScrcpyOptions2_1 {
    constructor(init: ScrcpyOptions2_1.Init, version = "2.1.1") {
        super(init, version);
    }
}

export { ScrcpyOptions2_1Impl as ScrcpyOptions2_1_1Impl } from "./2_1/index.js";
