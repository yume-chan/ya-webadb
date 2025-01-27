import { ScrcpyOptions3_0 } from "./3_0/index.js";

export class ScrcpyOptions3_0_1 extends ScrcpyOptions3_0 {
    constructor(init: ScrcpyOptions3_0.Init, version = "3.0.1") {
        super(init, version);
    }
}

export namespace ScrcpyOptions3_0_1 {
    export type Init = ScrcpyOptions3_0.Init;
}
