import { AdbScrcpyOptions3_3_3 } from "./3_3_3.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";

export class AdbScrcpyOptionsLatest<
    TVideo extends boolean,
> extends AdbScrcpyOptions3_3_3<TVideo> {
    constructor(
        init: AdbScrcpyOptions3_3_3.Init<TVideo>,
        clientOptions?: AdbScrcpyClientOptions,
    ) {
        super(init, clientOptions);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init<TVideo extends boolean = boolean> =
        AdbScrcpyOptions3_3_3.Init<TVideo>;
}
