import { AdbScrcpyOptions4_1 } from "./4_1.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";

export class AdbScrcpyOptionsLatest<
    TInit extends AdbScrcpyOptions4_1.Init = AdbScrcpyOptions4_1.Init,
> extends AdbScrcpyOptions4_1<TInit> {
    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init, clientOptions);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init = AdbScrcpyOptions4_1.Init;
}
