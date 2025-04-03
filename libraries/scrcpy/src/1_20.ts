import { ScrcpyOptions1_18 } from "./1_18/index.js";

export class ScrcpyOptions1_20 extends ScrcpyOptions1_18 {
    constructor(init: ScrcpyOptions1_18.Init) {
        super(init);
    }
}

export namespace ScrcpyOptions1_20 {
    export type Init = ScrcpyOptions1_18.Init;
}
