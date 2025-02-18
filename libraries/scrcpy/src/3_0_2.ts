import { ScrcpyOptions3_0 } from "./3_0/index.js";

export class ScrcpyOptions3_0_2<
    TVideo extends boolean,
> extends ScrcpyOptions3_0<TVideo> {
    constructor(init: ScrcpyOptions3_0.Init<TVideo>, version = "3.0.2") {
        super(init, version);
    }
}

export namespace ScrcpyOptions3_0_2 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_0.Init<TVideo>;
}
