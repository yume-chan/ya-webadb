import { AdbScrcpyOptions3_3_4 } from "./3_3_4.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";

export class AdbScrcpyOptionsLatest<
    TInit extends AdbScrcpyOptions3_3_4.Init = AdbScrcpyOptions3_3_4.Init,
> extends AdbScrcpyOptions3_3_4<TInit> {
    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init, clientOptions);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init = AdbScrcpyOptions3_3_4.Init;
}
