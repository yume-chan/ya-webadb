import { ScrcpyOptions2_6 } from "./2_6/index.js";

export class ScrcpyOptions2_6_1 extends ScrcpyOptions2_6 {
    constructor(init: ScrcpyOptions2_6.Init, version = "2.6.1") {
        super(init, version);
    }
}

export { ScrcpyOptions2_6Impl as ScrcpyOptions2_6_1Impl } from "./2_6/index.js";
