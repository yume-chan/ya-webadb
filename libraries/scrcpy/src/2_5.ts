import { ScrcpyOptions2_4 } from "./2_4/index.js";

export class ScrcpyOptions2_5 extends ScrcpyOptions2_4 {
    constructor(init: ScrcpyOptions2_4.Init, version = "2.5") {
        super(init, version);
    }
}

export namespace ScrcpyOptions2_5 {
    export type Init = ScrcpyOptions2_4.Init;
}
