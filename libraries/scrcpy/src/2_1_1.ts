import { ScrcpyOptions2_1 } from "./2_1/index.js";

export class ScrcpyOptions2_1_1<
    TVideo extends boolean,
> extends ScrcpyOptions2_1<TVideo> {
    constructor(init: ScrcpyOptions2_1.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptions2_1_1 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions2_1.Init<TVideo>;
}
