import { ScrcpyOptions3_2 } from "./3_2/index.js";

export class ScrcpyOptions3_3<
    TVideo extends boolean,
> extends ScrcpyOptions3_2<TVideo> {
    constructor(init: ScrcpyOptions3_2.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptions3_3 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_2.Init<TVideo>;
}
