import { ScrcpyOptions3_3_1 } from "./3_3_1/index.js";

export class ScrcpyOptions3_3_2<
    TVideo extends boolean,
> extends ScrcpyOptions3_3_1<TVideo> {
    constructor(init: ScrcpyOptions3_3_1.Init<TVideo>) {
        super(init);
    }
}

export namespace ScrcpyOptions3_3_2 {
    export type Init<TVideo extends boolean = boolean> =
        ScrcpyOptions3_3_1.Init<TVideo>;
}
