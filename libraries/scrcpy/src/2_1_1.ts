import { ScrcpyOptions2_1 } from "./2_1/index.js";

export class ScrcpyOptions2_1_1 extends ScrcpyOptions2_1 {
    constructor(init: ScrcpyOptions2_1.Init, version = "2.1.1") {
        super(init, version);
    }
}

export namespace ScrcpyOptions2_1_1 {
    export type Init = ScrcpyOptions2_1.Init;
}
