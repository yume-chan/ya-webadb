import { AdbScrcpyOptions5_0_1 } from "./5_0_1.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";

export class AdbScrcpyOptionsLatest<
    TInit extends AdbScrcpyOptions5_0_1.Init = AdbScrcpyOptions5_0_1.Init,
> extends AdbScrcpyOptions5_0_1<TInit> {
    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init, clientOptions);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init = AdbScrcpyOptions5_0_1.Init;
}
