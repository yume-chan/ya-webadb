import { AdbScrcpyOptions4_0 } from "./4_0.js";
import type { AdbScrcpyClientOptions } from "./client-options.js";

export class AdbScrcpyOptionsLatest<
    TInit extends AdbScrcpyOptions4_0.Init = AdbScrcpyOptions4_0.Init,
> extends AdbScrcpyOptions4_0<TInit> {
    constructor(init: TInit, clientOptions?: AdbScrcpyClientOptions) {
        super(init, clientOptions);
    }
}

export namespace AdbScrcpyOptionsLatest {
    export type Init = AdbScrcpyOptions4_0.Init;
}
