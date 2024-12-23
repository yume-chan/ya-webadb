import { ScrcpyOptions2_4 } from "./2_4/index.js";

export class ScrcpyOptions2_5 extends ScrcpyOptions2_4 {
    constructor(init: ScrcpyOptions2_4.Init, version = "2.5") {
        super(init, version);
    }
}

export { ScrcpyOptions2_4Impl as ScrcpyOptions2_5Impl } from "./2_4/index.js";
