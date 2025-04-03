import { ScrcpyOptions2_4 } from "./2_4/index.js";

export class ScrcpyOptions2_5<
    TVideo extends boolean,
> extends ScrcpyOptions2_4<TVideo> {
    constructor(init: ScrcpyOptions2_4.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptions2_5 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions2_4.Init<TVideo>;
}
