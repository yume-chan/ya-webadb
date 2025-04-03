import { ScrcpyOptions2_6 } from "./2_6/index.js";

export class ScrcpyOptions2_6_1<
    TVideo extends boolean,
> extends ScrcpyOptions2_6<TVideo> {
    constructor(init: ScrcpyOptions2_6.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptions2_6_1 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions2_6.Init<TVideo>;
}
