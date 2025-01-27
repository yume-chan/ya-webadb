import { ScrcpyOptions1_15 } from "./1_15/index.js";

export class ScrcpyOptions1_16 extends ScrcpyOptions1_15 {
    constructor(init: ScrcpyOptions1_15.Init, version = "1.16") {
        super(init, version);
    }
}

export namespace ScrcpyOptions1_16 {
    export type Init = ScrcpyOptions1_15.Init;
}
